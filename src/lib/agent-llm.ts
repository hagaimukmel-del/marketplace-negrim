import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { unitLabel } from '@/lib/catalog'
import { loadProducts } from '@/lib/app/catalog-server'
import type { AppProduct } from '@/lib/app/products'
import { normalize } from '@/lib/catalog-search'
import { loadCurrentPromo, recordPromoEvent, type CurrentPromo } from '@/lib/promo'
import { answerStatus } from '@/lib/agent-status'
import { cartQuantity, formatUnitPrice, type QuantityUnit, type WrittenQuantity } from '@/lib/agent-quantity'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  SHOW_LIMIT,
  cartItemOf,
  findMatchingProducts,
  type ActionButton,
  type ChatCartItem,
  type ConversationState,
  type MatchedProduct,
  type ProcurementRequest,
  type ProcurementResponse,
} from '@/lib/procurement-agent'

/**
 * The agent chat with Claude reading the carpenter's words (T-007). Claude
 * decides what to look up and words the answer; every product, price and cart
 * line comes from the catalogue through the tools below, built on the server.
 * Returns null whenever Claude is not configured, over the carpenter's limit,
 * slow, or fails, and the keyword agent answers instead.
 */

const MODEL = 'claude-opus-5-5'
/** Tool rounds before giving up on Claude and falling back. */
const MAX_ROUNDS = 5
const MAX_ANSWER = 1500
/** Earlier chat turns sent along, so "ובלבן?" or "תוסיף גם את השני" make sense. */
const MAX_HISTORY = 6

export interface ChatTurn {
  role: 'user' | 'agent'
  text: string
}

const SYSTEM = `You are the ordering assistant of נגרים B2B (nagarimb2b.com), a Hebrew B2B marketplace where Israeli carpentry shops order consumables, hardware and machines directly from suppliers.

You talk to one signed-in carpenter. Their message may be typed or a speech-to-text transcript from a noisy workshop, so read it generously: brand names may be spelled phonetically in Hebrew ("פי יו אר" is PUR, "בלום" is Blum), numbers may be words ("עשרים קילו"), and there may be filler words.

What you can do, only through the tools:
- search_catalogue: find products the platform sells, with supplier prices. Search with short product words, one product per call (call it several times for several products). If a search finds nothing, try once more with a simpler or more general word before saying it is not in the catalogue.
- prepare_cart: put found products into a cart proposal. The carpenter reviews it and presses a button to add it to the cart.
- get_order_status / get_quotes: the carpenter's own orders and quote requests.

Rules, without exception:
- Every product, supplier, price, pack size, document and fact you mention must come from a tool result in this conversation. Never use outside knowledge about products, prices or suppliers, and never invent one. If the catalogue has no answer, say so.
- Prices are per base unit (per ק״ג, ליטר, יח׳, מטר, מ״ר) and excl. VAT. Copy the price text the tool gives; do not compute totals.
- A product marked quote_only has no price: say the supplier gives the price in a quote.
- Never mention stock or availability counts.
- You never send an order and never say an order was sent. When the carpenter wants to order, call prepare_cart with the products and quantities, then tell them to check the list and press the button; they send the order from the cart.
- When the carpenter names a quantity, pass it to the tools; the tool rounds it up to whole packs and you report the quantity it returns.
- When a search returns several close products and the request does not say which, list them briefly and ask which one, instead of guessing. When it is clear, prepare the cart directly.
- If the carpenter prefers a supplier, pass its name as supplier; if that supplier does not sell the product, say so.
- Anything unrelated to buying from this catalogue or to their orders: say in one sentence that you help with the catalogue and orders.

Answer in Hebrew, short and plain, like a helpful salesperson on the phone: at most a few lines, product names in **bold**, no emoji, no headings, no links.`

const QUANTITY_UNITS: QuantityUnit[] = ['unit', 'kg', 'liter', 'meter', 'sqm', 'pack']

const quantityProperties = {
  quantity_amount: { type: ['number', 'null'], description: 'The amount the carpenter asked for, or null.' },
  quantity_unit: {
    anyOf: [{ type: 'string', enum: QUANTITY_UNITS }, { type: 'null' }],
    description: 'unit = pieces (יחידות), kg, liter, meter, sqm (מ״ר), pack = packs/buckets/cartons (דליים, ארגזים, קרטונים). Null without a quantity.',
  },
} as const

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_catalogue',
    description:
      'Search the marketplace catalogue for one product. Returns up to 4 matching products, each with a ref to use in prepare_cart, its suppliers and price per base unit excl. VAT, description and documents. partial=true means no product matched every word and these are only the closest.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Short Hebrew (or brand/model) product words, e.g. "דבק PUR", "ציר בלום קליפ", "לוח מלמין לבן 18".' },
        ...quantityProperties,
        supplier: { type: ['string', 'null'], description: 'A supplier the carpenter prefers, as they said it, or null.' },
      },
      required: ['query', 'quantity_amount', 'quantity_unit', 'supplier'],
      additionalProperties: false,
    },
  },
  {
    name: 'prepare_cart',
    description:
      'Prepare a cart proposal from products found by search_catalogue. Returns each line with the quantity that will go in the cart (whole packs, at least the supplier minimum). The carpenter adds it with one button; nothing is ordered.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: { ref: { type: 'string', description: 'The ref from search_catalogue.' }, ...quantityProperties },
            required: ['ref', 'quantity_amount', 'quantity_unit'],
            additionalProperties: false,
          },
        },
      },
      required: ['lines'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_order_status',
    description: "The status of one of the carpenter's own orders, by its number (e.g. 1048).",
    strict: true,
    input_schema: {
      type: 'object',
      properties: { order_number: { type: 'integer' } },
      required: ['order_number'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_quotes',
    description: "The carpenter's own quote requests and the prices suppliers quoted.",
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
]

/** What the tools found during one question, to build the buttons from. */
interface Session {
  live: AppProduct[]
  current: CurrentPromo | null
  carpenterId: string
  /** Products returned by search, by ref, with the quantity asked for there. */
  found: Map<string, { product: MatchedProduct; written: WrittenQuantity | null }>
  lastSearch: string[]
  cart: ChatCartItem[]
  quoteOnly: MatchedProduct[]
  statusActions: ActionButton[]
  promoViewed: boolean
}

function writtenOf(amount: unknown, unit: unknown): WrittenQuantity | null {
  if (typeof amount !== 'number' || !(amount > 0) || amount > 100000) return null
  if (typeof unit !== 'string' || !QUANTITY_UNITS.includes(unit as QuantityUnit)) return null
  const label = unit === 'pack' ? 'אריזות' : unitLabel(unit)
  return { amount, unit: unit as QuantityUnit, text: `${amount} ${label}` }
}

function supplierIdOf(live: AppProduct[], name: unknown): string | null {
  if (typeof name !== 'string' || !normalize(name)) return null
  const said = normalize(name)
  const offers = live.flatMap((product) => product.offers)
  const match =
    offers.find((offer) => normalize(offer.supplierName) === said) ??
    offers.find((offer) => normalize(offer.supplierName).includes(said) || said.includes(normalize(offer.supplierName)))
  return match?.supplierId ?? null
}

function cartLine(product: MatchedProduct, written: WrittenQuantity | null) {
  const offer = product.offers[0]
  if (!offer) return null
  const unit = unitLabel(product.baseUnit)
  const { quantity, ignored } = cartQuantity(written, { baseUnit: product.baseUnit, packQty: offer.packQty, minOrderQty: offer.minOrderQty })
  const packs = offer.packQty && offer.packQty > 1 ? ` (${quantity / offer.packQty} × ${offer.packLabel ?? 'אריזה'} של ${offer.packQty} ${unit})` : ''
  return { text: `${quantity} ${unit}${packs}`, ignored: ignored && written ? `the quantity "${written.text}" does not fit a product sold per ${unit}` : null }
}

async function searchTool(session: Session, input: Record<string, unknown>) {
  const query = typeof input.query === 'string' ? input.query.slice(0, 120) : ''
  if (!normalize(query)) return { error: 'empty query' }
  const written = writtenOf(input.quantity_amount, input.quantity_unit)
  const supplierId = supplierIdOf(session.live, input.supplier)
  const { matches, total, partial, promo } = await findMatchingProducts(session.live, session.current, query, supplierId)
  if (promo && matches[0]?.promoted && !session.promoViewed) {
    session.promoViewed = true
    await recordPromoEvent({ weekId: promo.weekId, kind: 'view', placement: 'agent', carpenterId: session.carpenterId })
  }

  session.lastSearch = []
  const products = matches.map((product) => {
    const ref = `p${session.found.size + 1}`
    session.found.set(ref, { product, written })
    session.lastSearch.push(ref)
    const unit = unitLabel(product.baseUnit)
    const live = session.live.find((p) => p.id === product.productId)
    return {
      ref,
      name: product.productName,
      ...(product.promoted ? { label: 'מוצר השבוע (קידום בתשלום): say so if you mention it' } : {}),
      brand: live?.brand ?? undefined,
      description: live?.description?.slice(0, 300) || undefined,
      attributes: live?.attributes.length ? Object.fromEntries(live.attributes.slice(0, 8)) : undefined,
      offers: product.offers.map((offer) => ({
        supplier: offer.supplierName,
        ...(offer.priceExclVat == null ? { quote_only: true } : { price: `${formatUnitPrice(offer.priceExclVat, unit)} לפני מע״מ` }),
        pack: offer.packQty && offer.packQty > 1 ? `${offer.packLabel ?? 'אריזה'} ${offer.packQty} ${unit}` : undefined,
        delivery: offer.leadTimeDays == null ? undefined : `${offer.leadTimeDays} days`,
        ...(offer.delivers === false ? { delivers_to_carpenter: false } : {}),
      })),
      documents: product.documents.length ? product.documents.map((doc) => doc.title_he) : undefined,
      cart_quantity: cartLine(product, written)?.text,
    }
  })
  return {
    total,
    partial,
    products,
    ...(supplierId == null && typeof input.supplier === 'string' && input.supplier ? { note: `no supplier named "${input.supplier}" sells in the catalogue` } : {}),
    ...(supplierId && matches.length && matches[0].offers[0]?.supplierId !== supplierId ? { note: 'the preferred supplier does not sell the first product' } : {}),
  }
}

function prepareCartTool(session: Session, input: Record<string, unknown>) {
  const lines = Array.isArray(input.lines) ? input.lines.slice(0, 12) : []
  const prepared: Record<string, unknown>[] = []
  for (const line of lines as Record<string, unknown>[]) {
    const entry = typeof line.ref === 'string' ? session.found.get(line.ref) : undefined
    if (!entry) {
      prepared.push({ ref: line.ref, error: 'unknown ref: search for the product first' })
      continue
    }
    const written = writtenOf(line.quantity_amount, line.quantity_unit) ?? entry.written
    const item = cartItemOf(entry.product, written)
    if (!item) {
      prepared.push({ ref: line.ref, error: 'no supplier offers this product' })
    } else if (item.quote_only) {
      if (!session.quoteOnly.includes(entry.product)) session.quoteOnly.push(entry.product)
      prepared.push({ ref: line.ref, name: item.name_he, quote_only: true, note: 'not added: the carpenter asks this supplier for a quote from the product page' })
    } else {
      session.cart = session.cart.filter((existing) => existing.id !== item.id)
      session.cart.push(item)
      const quantity = cartLine(entry.product, written)
      prepared.push({ ref: line.ref, name: item.name_he, supplier: item.supplier_name, cart_quantity: quantity?.text, ...(quantity?.ignored ? { note: quantity.ignored } : {}) })
    }
  }
  return { lines: prepared, cart_lines: session.cart.length }
}

async function statusTool(session: Session, question: Parameters<typeof answerStatus>[0]) {
  const { message, actions } = await answerStatus(question, session.carpenterId)
  for (const action of actions) if (!session.statusActions.some((a) => a.value === action.value)) session.statusActions.push(action)
  return { answer: message }
}

async function runTool(session: Session, name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_catalogue':
      return searchTool(session, input)
    case 'prepare_cart':
      return prepareCartTool(session, input)
    case 'get_order_status':
      return typeof input.order_number === 'number' && Number.isInteger(input.order_number)
        ? statusTool(session, { kind: 'order', number: input.order_number })
        : { error: 'order_number must be an integer' }
    case 'get_quotes':
      return statusTool(session, { kind: 'quotes' })
    default:
      return { error: `unknown tool ${name}` }
  }
}

/** The buttons under Claude's answer, from what the tools found: never from its text. */
function actionsOf(session: Session, query: string): { actions: ActionButton[]; state: ConversationState; matchCount: number } {
  const actions: ActionButton[] = []
  for (const product of session.quoteOnly) {
    actions.push({ label: `בקש הצעת מחיר: ${product.productName}`, action: 'open-page', value: `/app/product/${product.productId}?quote=1` })
  }
  if (session.cart.length > 0) {
    actions.unshift({
      label: session.cart.length === 1 ? '➕ הוסף לעגלה' : `➕ הוסף הכול לעגלה (${session.cart.length})`,
      action: 'add-all',
      items: session.cart,
    })
    return { actions: [...actions, ...session.statusActions], state: 'results_order', matchCount: session.cart.length }
  }
  if (session.statusActions.length > 0 && session.lastSearch.length === 0) {
    return { actions: session.statusActions, state: 'status', matchCount: 0 }
  }

  const shown = session.lastSearch.slice(0, SHOW_LIMIT).map((ref) => session.found.get(ref)!)
  if (shown.length === 1) {
    const { product, written } = shown[0]
    const item = cartItemOf(product, written)
    if (item?.quote_only) {
      actions.push({ label: 'בקש הצעת מחיר', action: 'open-page', value: `/app/product/${product.productId}?quote=1` })
    } else if (item) {
      actions.push({ label: '➕ הוסף לעגלה', action: 'add-to-cart', value: product.productId, item })
    }
    actions.push({ label: 'לדף המוצר', action: 'open-page', value: `/app/product/${product.productId}` })
    if (item) actions.push({ label: 'שאלה לספק', action: 'contact-supplier', value: item.supplier_id, item })
  } else {
    shown.forEach(({ product, written }, i) => {
      actions.push({ label: `${i + 1}) ${product.productName}`, action: `select-${i + 1}`, value: product.productId, item: cartItemOf(product, written) })
    })
  }
  if (shown.length > 0) actions.push({ label: 'כל התוצאות בקטלוג', action: 'open-catalog', value: query })
  const state: ConversationState = shown.length === 0 ? (session.found.size ? 'done' : 'no_results') : shown.length === 1 ? 'results_single' : 'results_multiple'
  return { actions: [...actions, ...session.statusActions], state, matchCount: shown.length }
}

/** Earlier turns as alternating messages, starting with the carpenter's. */
function historyMessages(history: ChatTurn[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  for (const turn of history.slice(-MAX_HISTORY)) {
    const role = turn.role === 'user' ? 'user' : 'assistant'
    const text = turn.text.trim().slice(0, 500)
    if (!text) continue
    const last = messages[messages.length - 1]
    if (last?.role === role) last.content = `${last.content}\n${text}`
    else if (messages.length > 0 || role === 'user') messages.push({ role, content: text })
  }
  // The new message is the carpenter's, so history ends with an answer
  if (messages[messages.length - 1]?.role === 'user') messages.pop()
  return messages
}

let defaultClient: Anthropic | null = null

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AGENT_LLM !== 'off'
}

export async function answerWithClaude(
  request: ProcurementRequest & { history?: ChatTurn[] },
  client: Pick<Anthropic, 'messages'> | null = null
): Promise<ProcurementResponse | null> {
  if (!client) {
    if (!claudeConfigured()) return null
    defaultClient ??= new Anthropic({ timeout: 20_000, maxRetries: 1 })
    client = defaultClient
  }
  // A cost cap per carpentry; over it, the keyword agent still answers
  if (!checkRateLimit(`agent:${request.carpenterId}`, 'agentLlm').allowed) return null

  const started = Date.now()
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  try {
    const [live, current] = await Promise.all([loadProducts({ showPrices: true, city: request.city ?? null }), loadCurrentPromo()])
    const session: Session = {
      live,
      current,
      carpenterId: request.carpenterId,
      found: new Map(),
      lastSearch: [],
      cart: [],
      quoteOnly: [],
      statusActions: [],
      promoViewed: false,
    }
    const messages: Anthropic.MessageParam[] = [...historyMessages(request.history ?? []), { role: 'user', content: request.userMessage }]

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
      })
      usage.input += response.usage.input_tokens
      usage.output += response.usage.output_tokens
      usage.cacheRead += response.usage.cache_read_input_tokens ?? 0
      usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0

      // A cut-off or declined turn never runs its tools; the keyword agent answers
      if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null

      const calls = response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      if (calls.length === 0) {
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
          .trim()
        if (!text) return null
        const { actions, state, matchCount } = actionsOf(session, request.userMessage)
        return { success: true, message: text.slice(0, MAX_ANSWER), state, matchCount, actions, engine: 'claude' }
      }

      messages.push({ role: 'assistant', content: response.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const call of calls) {
        const input = call.input && typeof call.input === 'object' ? (call.input as Record<string, unknown>) : {}
        const result = await runTool(session, call.name, input)
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result), ...(result && typeof result === 'object' && 'error' in result ? { is_error: true } : {}) })
      }
      messages.push({ role: 'user', content: results })
    }
    return null
  } catch (err) {
    console.error('agent.llm error', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err)
    return null
  } finally {
    // Tokens per question, so the cost per question is measured, not guessed
    console.info('agent.llm', JSON.stringify({ carpenter: request.carpenterId, ms: Date.now() - started, ...usage }))
  }
}
