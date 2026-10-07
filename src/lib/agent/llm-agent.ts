import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { STATUS_LABEL, totalOf, type AppOrder } from '@/lib/app/orders'
import { sortedOffers, stepOf, suggestedOffer, type AppProduct } from '@/lib/app/products'
import { searchProducts } from '@/lib/catalog-search'
import type { ActionButton, ChatCartItem } from '@/lib/procurement-agent'
import type { SessionCarpenter } from '@/lib/carpenter-auth'

/**
 * The conversational agent: Claude with tools that read this site and nothing
 * else. It answers from the catalogue and the carpentry's own orders, prepares
 * a cart, and says plainly what the site does not have or does not do.
 *
 * It never sends an order (the carpenter does, with one click) and never sees
 * the web. Buttons in its answer are built here from the database, so a price
 * on a button is always the catalogue's, whatever the model wrote.
 */

/** Chosen by the owner on 07.10. Overridable without a deploy of code. */
const MODEL = process.env.AGENT_MODEL || 'claude-sonnet-5-5'
const MAX_ROUNDS = 6
const MAX_TOKENS = 4000

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentReply {
  message: string
  actions: ActionButton[]
}

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

const SYSTEM = `You are the assistant of "שוק הנגרים" (nagarimb2b.com), a Hebrew B2B ordering site for Israeli carpentry shops (נגריות). You are talking with a signed-in carpentry. Always answer in Hebrew, short and friendly, like a knowledgeable colleague at a supply counter. Plain text only: no markdown, no tables, no emoji.

How the site works (facts you can rely on):
- Carpenters browse a catalogue of consumables, hardware and machines and send purchase orders (הזמנות רכש) directly to suppliers. One cart is split into one purchase order per supplier.
- The supplier is the seller: it confirms the order, delivers it, and issues the invoice directly to the carpentry, on its own payment terms (for example שוטף+30). The site never takes payment and never issues invoices or receipts.
- Prices are per base unit (unit, kg, liter, meter, sqm) and excl. VAT. The order page and the supplier's invoice are what count.
- Order statuses: ממתינה לאישור (waiting for the supplier), אושרה, בהכנה, בדרך אליך, התקבלה, בוטלה. The supplier may change quantities or amounts when it confirms.
- Pages: קטלוג /app/catalog, עגלה /app/order, ההזמנות שלי /app/orders (each order at /app/orders/<id>), החשבון שלי /app/account, המציאון /app/metzion (carpenters pass leftover materials and equipment to each other; the deal is between them).
- Today the catalogue is mostly adhesives and finishing materials, from a small number of suppliers. More suppliers and categories are being added.

Rules:
- Answer only from what the tools return and the facts above. Never invent products, prices, suppliers, stock, dates or features. If you do not know, say so.
- Never mention stock levels or say an item is in or out of stock: the site does not track stock; the supplier confirms availability on the order.
- If something is not in the catalogue, say it is not on the site right now, and suggest a close alternative from the catalogue if there is one, or המציאון for used/leftover items.
- If the carpenter asks for something the site cannot do (a PDF of an order, tracking a truck, paying, an invoice), say honestly that it does not exist on the site, and offer what does exist (for example the order page, or a question to the supplier). Invoices come from the supplier.
- Delivery times: use the supplier's lead time (lead_days, in business days) and the order's dates to give an estimate, clearly marked as an estimate ("בערך", "לפי זמן האספקה של הספק"). If there is no lead time, say the supplier will confirm. For exact times the carpenter can ask the supplier.
- You never send orders. You can put products in the cart; the carpenter reviews the cart and sends it.
- Stay on the site and carpentry purchasing. For unrelated requests, say politely that you help with ordering on the site.
- Do not call yourself AI or a bot. If asked, you are the site's assistant.

Buttons: after you have the information, call show_buttons once with the buttons that help the carpenter act on your answer (add to cart, product page, question to supplier, open a page). Use product ids exactly as the tools returned them. Then write your answer. Do not describe the buttons in detail; at most say "אפשר להוסיף לעגלה מכאן".`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_catalog',
    description:
      'Search the live catalogue (Hebrew or English, brand, model number). Returns up to 8 products with id, name, brand, unit, and each supplier offer: price per unit excl. VAT, pack, lead time in business days, payment terms, minimum order. "partial" means no product matched every word.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to search for, in the carpenter\'s words or a cleaner form.' } },
      required: ['query'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'get_product',
    description: 'Full details of one catalogue product by id: description, attributes, every supplier offer.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'list_categories',
    description: 'The catalogue categories with how many products are in each. Use to say what the site carries.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    name: 'my_orders',
    description:
      "This carpentry's recent purchase orders, newest first: number, status, supplier, dates (sent, confirmed, shipped, delivered), lines, total excl. VAT, supplier lead time, supplier note, and today's date for estimates.",
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'How many orders, 1 to 10.' } },
      required: ['limit'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'show_buttons',
    description:
      'Attach buttons under your answer. add_to_cart puts one pack of the product (from its suggested supplier) in the cart. product_page opens the product. ask_supplier lets the carpenter write a question to the supplier of that product. open_page opens one of the site pages listed in the instructions.',
    input_schema: {
      type: 'object',
      properties: {
        buttons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['add_to_cart', 'product_page', 'ask_supplier', 'open_page'] },
              product_id: { type: 'string', description: 'For add_to_cart, product_page, ask_supplier. Empty for open_page.' },
              path: { type: 'string', description: 'For open_page, e.g. /app/orders. Empty otherwise.' },
            },
            required: ['kind', 'product_id', 'path'],
            additionalProperties: false,
          },
        },
      },
      required: ['buttons'],
      additionalProperties: false,
    },
    strict: true,
  },
]

const PAGE_LABELS: [RegExp, string][] = [
  [/^\/app\/orders\/[0-9a-f-]{36}$/, 'לדף ההזמנה'],
  [/^\/app\/orders$/, 'ההזמנות שלי'],
  [/^\/app\/order$/, 'לעגלה'],
  [/^\/app\/catalog(\/[0-9a-f-]{36})?$/, 'לקטלוג'],
  [/^\/app\/account$/, 'החשבון שלי'],
  [/^\/app\/metzion$/, 'למציאון'],
]

function offerView(product: AppProduct) {
  return sortedOffers(product).map((offer) => ({
    supplier: offer.supplierName,
    price_per_unit_excl_vat: offer.price,
    unit: product.unit,
    pack: offer.packQty && offer.packQty > 1 ? `${offer.packLabel ?? 'חבילה'} ${offer.packQty} ${product.unit}` : null,
    lead_days: offer.leadDays,
    payment_terms: offer.terms,
    supplier_min_order_excl_vat: offer.minOrder,
    suggested: offer.suggested,
  }))
}

function productView(product: AppProduct, full: boolean) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    model_number: product.mpn,
    unit: product.unit,
    ...(full ? { description: product.description, attributes: Object.fromEntries(product.attributes) } : {}),
    offers: offerView(product),
  }
}

function orderView(order: AppOrder) {
  return {
    id: order.id,
    number: order.orderNumber,
    status: STATUS_LABEL[order.status] ?? order.status,
    supplier: order.supplier?.name ?? null,
    supplier_phone: order.supplier?.phone ?? null,
    supplier_lead_days: order.supplier?.leadDays ?? null,
    sent_at: order.createdAt,
    confirmed_at: order.confirmedAt,
    shipped_at: order.shippedAt,
    delivered_at: order.deliveredAt,
    total_excl_vat: totalOf(order),
    supplier_note: order.supplierNote,
    lines: order.lines.map((line) => `${line.name} × ${line.quantity} ${line.unit}`),
  }
}

function cartItemOf(product: AppProduct): ChatCartItem | undefined {
  const offer = suggestedOffer(product)
  if (!offer || offer.price == null) return undefined
  return {
    id: product.id,
    name_he: product.name,
    base_price_excl_vat: offer.price,
    supplier_id: offer.supplierId,
    supplier_name: offer.supplierName,
    unit: product.unit,
    pack_label: offer.packLabel,
    pack_qty: offer.packQty,
    quantity: stepOf(offer),
  }
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

/** One conversation's view of the site: loaded once per request, and only when a tool needs it. */
class SiteTools {
  private products: Promise<AppProduct[]> | null = null
  private orders: Promise<AppOrder[]> | null = null
  readonly actions: ActionButton[] = []

  constructor(private readonly carpenter: SessionCarpenter) {}

  private catalog() {
    this.products ??= loadProducts({ showPrices: true })
    return this.products
  }

  private myOrders() {
    this.orders ??= loadCarpenterOrders(this.carpenter.id)
    return this.orders
  }

  private async product(id: string) {
    return (await this.catalog()).find((product) => product.id === id) ?? null
  }

  async run(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_catalog': {
        const query = String(input.query ?? '').slice(0, 200)
        const { products, partial } = searchProducts(await this.catalog(), query)
        return { query, total: products.length, partial, products: products.slice(0, 8).map((p) => productView(p, false)) }
      }
      case 'get_product': {
        const product = await this.product(String(input.product_id ?? ''))
        return product ? productView(product, true) : { error: 'No live product with this id.' }
      }
      case 'list_categories': {
        const tree = await loadCategoryTree(await this.catalog())
        return tree.map((node) => ({ name: node.name, products: node.count, id: node.id }))
      }
      case 'my_orders': {
        const limit = Math.min(Math.max(Number(input.limit) || 5, 1), 10)
        const orders = await this.myOrders()
        return { today: today(), count: orders.length, orders: orders.slice(0, limit).map(orderView) }
      }
      case 'show_buttons':
        return this.buttons(Array.isArray(input.buttons) ? input.buttons : [])
      default:
        return { error: `Unknown tool ${name}` }
    }
  }

  private async buttons(requested: unknown[]) {
    const skipped: string[] = []
    for (const raw of requested.slice(0, 6)) {
      const button = raw as { kind?: string; product_id?: string; path?: string }
      if (button.kind === 'open_page') {
        const path = String(button.path ?? '')
        const label = PAGE_LABELS.find(([pattern]) => pattern.test(path))?.[1]
        if (label) this.actions.push({ label, action: 'open-page', value: path })
        else skipped.push(`page ${path}`)
        continue
      }
      const product = await this.product(String(button.product_id ?? ''))
      if (!product) {
        skipped.push(`product ${button.product_id}`)
        continue
      }
      const item = cartItemOf(product)
      const short = product.name.length > 28 ? `${product.name.slice(0, 26)}…` : product.name
      if (button.kind === 'product_page') {
        this.actions.push({ label: `לדף המוצר: ${short}`, action: 'open-page', value: `/app/product/${product.id}` })
      } else if (button.kind === 'add_to_cart' && item) {
        this.actions.push({ label: `הוסף לעגלה: ${short}`, action: 'add-to-cart', value: product.id, item })
      } else if (button.kind === 'ask_supplier' && item) {
        this.actions.push({ label: `שאלה לספק על ${short}`, action: 'contact-supplier', value: item.supplier_id, item })
      } else {
        skipped.push(`${button.kind} ${product.id}`)
      }
    }
    return { shown: this.actions.length, skipped }
  }
}

let client: Anthropic | null = null

/**
 * One answer to the conversation so far. `history` is text only, oldest first,
 * ending with the carpenter's new message; earlier tool calls are not replayed.
 */
export async function runAgent(carpenter: SessionCarpenter, history: ChatTurn[]): Promise<AgentReply> {
  client ??= new Anthropic()
  const tools = new SiteTools(carpenter)
  const who = `The carpentry is "${carpenter.business_name}"${carpenter.contact_name ? `, contact ${carpenter.contact_name}` : ''}${carpenter.city ? `, in ${carpenter.city}` : ''}.`
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((turn) => ({ role: turn.role, content: turn.content }))
  messages.push({ role: 'system', content: who } as unknown as Anthropic.Beta.BetaMessageParam)

  let text = ''
  const usage = { input: 0, output: 0, cached: 0, rounds: 0, tools: [] as string[] }
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    })
    usage.rounds++
    usage.input += response.usage.input_tokens
    usage.output += response.usage.output_tokens
    usage.cached += response.usage.cache_read_input_tokens ?? 0

    if (response.stop_reason === 'refusal') {
      text = 'על זה אני לא יכול לעזור. אפשר לשאול אותי על מוצרים, מחירים, הזמנות ואספקה באתר.'
      break
    }

    text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    const calls = response.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use')
    if (response.stop_reason !== 'tool_use' || calls.length === 0) break

    messages.push({ role: 'assistant', content: response.content })
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const call of calls) {
      usage.tools.push(call.name)
      try {
        const result = await tools.run(call.name, (call.input ?? {}) as Record<string, unknown>)
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result) })
      } catch (err) {
        console.error('agent.tool', call.name, err)
        results.push({ type: 'tool_result', tool_use_id: call.id, content: 'The tool failed. Tell the carpenter to try again shortly.', is_error: true })
      }
    }
    messages.push({ role: 'user', content: results })
  }

  console.info('agent.llm', JSON.stringify({ carpenter: carpenter.id, model: MODEL, ...usage }))
  return {
    message: text || 'לא הצלחתי לענות הפעם. נסה לנסח שוב, או חפש בקטלוג.',
    actions: tools.actions,
  }
}
