import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { unitLabel } from '@/lib/catalog'
import { loadProducts } from '@/lib/app/catalog-server'
import { sortedOffers, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import { searchProducts } from '@/lib/catalog-search'
import { loadCurrentPromo, recordPromoEvent, type CurrentPromo } from '@/lib/promo'
import { splitItems, supplierPreference } from '@/lib/agent-request'
import { statusQuestion } from '@/lib/agent-shortcuts'
import { answerStatus } from '@/lib/agent-status'
import { cartQuantity, formatUnitPrice, parseQuantity, type WrittenQuantity } from '@/lib/agent-quantity'

/**
 * Procurement agent for carpenters, by keyword matching. Claude answers first
 * when it is configured (lib/agent-llm.ts, T-007); this is its fallback.
 *
 * 1. Read a written quantity, if any ("20 ק״ג").
 * 2. Search the catalogue with the catalogue's own search (lib/catalog-search).
 * 3. Answer in Hebrew with the offers the catalogue would show this carpentry,
 *    and buttons that carry the product, so the chat itself stays stateless.
 */

export type ConversationState = 'results_single' | 'results_multiple' | 'results_order' | 'status' | 'no_results' | 'done'

/**
 * A cart line, built server-side from the offer the carpenter was shown.
 * Same fields every other add-to-cart passes; the server re-reads the price
 * before ordering.
 */
export interface ChatCartItem {
  id: string
  name_he: string
  base_price_excl_vat: number
  supplier_id: string
  supplier_name: string
  unit: string
  pack_label: string | null
  pack_qty: number | null
  /** In base units: the written quantity in whole packs, else one pack or the supplier's minimum if larger. */
  quantity: number
  /** The supplier quotes only (T-023): no price, and the carpenter asks for a quote instead of adding it. */
  quote_only?: boolean
}

export interface ActionButton {
  label: string
  action: string
  value?: string
  item?: ChatCartItem
  /** "הוסף הכול לעגלה": every line of an order sentence (T-003). */
  items?: ChatCartItem[]
}

export interface ProcurementRequest {
  userMessage: string
  carpenterId: string
  /** The carpentry's city, so the agent suggests the same supplier the catalogue does (T-026). */
  city?: string | null
}

/** What the chat receives: the answer and its buttons, nothing else. */
export interface ProcurementResponse {
  success: boolean
  message: string
  state: ConversationState
  /** How many products the answer shows, for the log line. */
  matchCount: number
  actions: ActionButton[]
  /** Which agent answered, for the log line: Claude, or the keyword matching it falls back to. */
  engine?: 'claude' | 'keywords'
}

export interface MatchedOffer {
  supplierId: string
  supplierName: string
  /** Per base unit, as stored. Null for a supplier who quotes only (T-023). */
  priceExclVat: number | null
  packLabel: string | null
  packQty: number | null
  minOrderQty: number
  leadTimeDays: number | null
  /** False when the supplier does not deliver to this carpentry's region. */
  delivers: boolean | null
}

export interface MatchedProduct {
  productId: string
  productName: string
  baseUnit: string
  /** This week's "מוצר השבוע", put first because the search is in its field (T-024). */
  promoted: boolean
  /** The offer the catalogue suggests first, then the rest in the catalogue's order, up to 3. */
  offers: MatchedOffer[]
  documents: { title_he: string; doc_type: string; file_url: string }[]
}

export const SHOW_LIMIT = 4

function offerOf(offer: AppOffer): MatchedOffer {
  return {
    supplierId: offer.supplierId,
    supplierName: offer.supplierName,
    priceExclVat: offer.price,
    packLabel: offer.packLabel,
    packQty: offer.packQty,
    minOrderQty: offer.minOrderQty,
    leadTimeDays: offer.leadDays,
    delivers: offer.delivers,
  }
}

/**
 * The offers in the order the catalogue shows them to this carpentry: the
 * suggested one first (it already prefers suppliers that deliver here), the
 * promoted supplier first for "מוצר השבוע".
 */
function offersOf(product: AppProduct, promotedSupplierId: string | null): MatchedOffer[] {
  const lead =
    (promotedSupplierId && product.offers.find((offer) => offer.supplierId === promotedSupplierId)) || suggestedOffer(product)
  const rest = sortedOffers(product).filter((offer) => offer !== lead)
  return (lead ? [lead, ...rest] : rest).slice(0, 3).map(offerOf)
}

export function cartItemOf(product: MatchedProduct, written: WrittenQuantity | null): ChatCartItem | undefined {
  const offer = product.offers[0]
  if (!offer) return undefined
  const { quantity } = cartQuantity(written, { baseUnit: product.baseUnit, packQty: offer.packQty, minOrderQty: offer.minOrderQty })
  return {
    id: product.productId,
    name_he: product.productName,
    base_price_excl_vat: offer.priceExclVat ?? 0,
    supplier_id: offer.supplierId,
    supplier_name: offer.supplierName,
    unit: unitLabel(product.baseUnit),
    pack_label: offer.packLabel,
    pack_qty: offer.packQty,
    quantity,
    ...(offer.priceExclVat == null ? { quote_only: true } : {}),
  }
}

/**
 * Products for the message, from the catalogue's own search, so the chat and
 * the search bar return the same products for the same words. Live products
 * only, with offers exactly as the catalogue builds them for this carpentry.
 */
export async function findMatchingProducts(
  live: AppProduct[],
  current: CurrentPromo | null,
  message: string,
  preferredSupplier: string | null
): Promise<{ matches: MatchedProduct[]; total: number; partial: boolean; promo: { weekId: string } | null }> {
  const { products: found, partial } = searchProducts(live, message)

  // "מוצר השבוע" goes first, labelled, when the search lands in its main
  // category. A paid slot, never a silent ranking change (T-024).
  let hits = found
  let total = found.length
  let promo: { weekId: string; supplierId: string } | null = null
  if (current && found.length > 0) {
    const promoted = live.find(
      (product) => product.id === current.productId && product.offers.some((offer) => offer.supplierId === current.supplierId)
    )
    if (promoted?.topId && found.some((product) => product.topId === promoted.topId)) {
      if (!found.some((product) => product.id === promoted.id)) total += 1
      hits = [promoted, ...found.filter((product) => product.id !== promoted.id)]
      promo = { weekId: current.id, supplierId: current.supplierId }
    }
  }

  const matches: MatchedProduct[] = hits.slice(0, SHOW_LIMIT).map((product, i) => {
    const promoted = promo !== null && i === 0
    // The carpenter's own choice of supplier comes before the paid slot's
    return matchOf(product, preferredSupplier ?? (promoted ? promo!.supplierId : null), promoted)
  })

  // Documents only matter for a single answer, where they are listed
  if (matches.length === 1) {
    const { data: docs, error } = await getSupabaseAdmin()
      .from('product_documents')
      .select('title_he, doc_type, file_url')
      .eq('product_id', matches[0].productId)
      .order('uploaded_at', { ascending: false })
      .limit(2)
    if (error) console.error('Agent documents error:', error)
    matches[0].documents = docs ?? []
  }

  return { matches, total, partial, promo: promo && { weekId: promo.weekId } }
}

export function matchOf(product: AppProduct, leadSupplierId: string | null, promoted = false): MatchedProduct {
  return {
    productId: product.id,
    productName: product.name,
    baseUnit: product.baseUnit,
    promoted,
    offers: offersOf(product, leadSupplierId),
    documents: [],
  }
}

interface OrderLine {
  /** The words the carpenter wrote for this item. */
  query: string
  quantity: WrittenQuantity | null
  /** The best full match, or null when nothing matches every word. */
  match: MatchedProduct | null
  /** Other products that match every word too. */
  more: number
}

/**
 * Several products in one sentence (T-003): each part is searched on its own
 * and must match every word, or it is reported as not found. Null when the
 * sentence does not split into at least two parts, or none of them is found.
 */
function findOrderLines(live: AppProduct[], message: string, preferredSupplierId: string | null): OrderLine[] | null {
  const items = splitItems(message)
  if (items.length < 2) return null
  const lines = items.map((item): OrderLine => {
    const { products, partial } = searchProducts(live, item.query)
    const best = partial ? null : products[0] ?? null
    return {
      query: item.query,
      quantity: item.quantity,
      match: best && matchOf(best, preferredSupplierId),
      more: partial ? 0 : Math.max(products.length - 1, 0),
    }
  })
  return lines.some((line) => line.match) ? lines : null
}

function formatLeadTime(days: number | null): string {
  if (days == null) return ''
  if (days === 0) return 'היום'
  if (days === 1) return 'מחר'
  return `${days} ימים`
}

const DOC_LABELS: Record<string, string> = {
  spec_sheet: 'דף טכני',
  usage_guide: 'הנחיות שימוש',
  image: 'תמונה',
  datasheet: 'דטאשיט',
  other: 'מסמך',
}

/** "20 ק״ג → 4 דליים של 5 ק״ג", or why the written quantity was not used. */
function quantityLine(product: MatchedProduct, written: WrittenQuantity | null): string {
  const offer = product.offers[0]
  if (!written || !offer) return ''
  const unit = unitLabel(product.baseUnit)
  const { quantity, ignored } = cartQuantity(written, { baseUnit: product.baseUnit, packQty: offer.packQty, minOrderQty: offer.minOrderQty })
  if (ignored) return `\n\nאת הכמות "${written.text}" לא הצלחתי להמיר: המוצר נמכר לפי ${unit}. לעגלה ייכנסו ${quantity} ${unit}, ואפשר לשנות שם.`
  const packs = offer.packQty && offer.packQty > 1 ? ` (${quantity / offer.packQty} × ${offer.packLabel ?? 'אריזה'} של ${offer.packQty} ${unit})` : ''
  return `\n\nכמות לעגלה: ${quantity} ${unit}${packs}`
}

function generateResponse(
  message: string,
  matches: MatchedProduct[],
  { total, partial, written }: { total: number; partial: boolean; written: WrittenQuantity | null }
): string {
  if (matches.length === 0) {
    return `לא מצאתי בקטלוג מוצר שמתאים ל"${message.trim()}".\nנסה מילה אחרת, שם יצרן או מק״ט, או עיין בקטלוג לפי קטגוריות.`
  }

  if (matches.length === 1) {
    const product = matches[0]
    const unit = unitLabel(product.baseUnit)
    let response = `${partial ? 'לא מצאתי התאמה מדויקת. הכי קרוב:' : 'מצאתי מוצר שמתאים:'}\n\n**${product.productName}**${product.promoted ? ' · מוצר השבוע (קידום בתשלום)' : ''}`

    if (product.documents.length > 0) {
      response += '\n\nמסמכים טכניים:'
      for (const doc of product.documents) {
        response += `\n- ${DOC_LABELS[doc.doc_type] ?? 'מסמך'}: [${doc.title_he}](${doc.file_url})`
      }
    }

    if (product.offers.length > 0) {
      response += '\n\nאפשרויות רכש:'
      for (const offer of product.offers.slice(0, 2)) {
        response += `\n- **${offer.supplierName}**`
        response += offer.priceExclVat == null ? ' • מחיר בהצעה מהספק' : ` • ${formatUnitPrice(offer.priceExclVat, unit)} לפני מע״מ`
        if (offer.packQty && offer.packQty > 1) response += ` • ${offer.packLabel ?? 'אריזה'} ${offer.packQty} ${unit}`
        // stock_qty is a placeholder on synced rows, so stock is never shown
        const lead = formatLeadTime(offer.leadTimeDays)
        if (lead) response += ` • אספקה: ${lead}`
        if (offer.delivers === false) response += ' • לא מגיע לאזור שלך'
      }
    } else {
      response += '\n\nאין כרגע ספק שמציע את המוצר הזה.'
    }
    return response + quantityLine(product, written)
  }

  const showLimit = Math.min(SHOW_LIMIT, matches.length)
  let response = partial
    ? 'לא מצאתי מוצר שמתאים לכל המילים. אלה הקרובים ביותר:\n'
    : total > showLimit
      ? `מצאתי ${total} מוצרים. הנה ${showLimit} הראשונים:\n`
      : `מצאתי ${total} מוצרים שמתאימים:\n`

  matches.slice(0, showLimit).forEach((product, i) => {
    response += `\n${i + 1}) **${product.productName}**${product.promoted ? ' · מוצר השבוע (קידום)' : ''}`
    const offer = product.offers[0]
    if (offer) {
      response += offer.priceExclVat == null ? ' · מחיר בהצעה' : ` · ${formatUnitPrice(offer.priceExclVat, unitLabel(product.baseUnit))}`
      response += ` (${offer.supplierName})`
    }
  })

  response +=
    total > showLimit && !partial
      ? '\n\nבחר מוצר מהרשימה, או כתוב מותג, מק״ט או גודל כדי לצמצם.'
      : '\n\nבחר מוצר מהרשימה, או כתוב עוד פרטים כדי לצמצם.'
  return response
}

/**
 * The answer to an order sentence: one line per product, the quantity that
 * goes into the cart, and one button that adds them all. The carpenter sends
 * the order from the cart, as always; the agent never sends one.
 */
function orderLinesResponse(lines: OrderLine[], preferredName: string | null, preferredId: string | null): ProcurementResponse {
  const found = lines.filter((line): line is OrderLine & { match: MatchedProduct } => line.match !== null)
  let message = `הכנתי ${found.length === 1 ? 'מוצר אחד' : `${found.length} מוצרים`} לעגלה:\n`
  const actions: ActionButton[] = []
  const items: ChatCartItem[] = []

  found.forEach((line, i) => {
    const product = line.match
    const offer = product.offers[0]
    const unit = unitLabel(product.baseUnit)
    const item = cartItemOf(product, line.quantity)
    message += `\n${i + 1}) **${product.productName}**`
    if (offer) {
      message += offer.priceExclVat == null ? ' · מחיר בהצעה' : ` · ${formatUnitPrice(offer.priceExclVat, unit)}`
      message += ` (${offer.supplierName})`
      if (preferredId && offer.supplierId !== preferredId) message += ` · ${preferredName} לא מציע את המוצר`
      if (offer.delivers === false) message += ' · לא מגיע לאזור שלך'
    }
    if (item && !item.quote_only) {
      const { ignored } = cartQuantity(line.quantity, { baseUnit: product.baseUnit, packQty: offer?.packQty ?? null, minOrderQty: offer?.minOrderQty ?? 1 })
      message += `\n   כמות: ${item.quantity} ${unit}${ignored && line.quantity ? ` (את "${line.quantity.text}" לא הצלחתי להמיר)` : ''}`
      items.push(item)
    } else if (item?.quote_only) {
      message += '\n   לפי הצעת מחיר מהספק, לא נכנס לעגלה'
      actions.push({ label: `בקש הצעת מחיר: ${product.productName}`, action: 'open-page', value: `/app/product/${product.productId}?quote=1` })
    }
    if (line.more > 0) {
      message += `\n   יש עוד ${line.more} ${line.more === 1 ? 'אפשרות' : 'אפשרויות'}`
      actions.push({ label: `אפשרויות ל"${line.query}"`, action: 'ask', value: [line.query, line.quantity?.text].filter(Boolean).join(' ') })
    }
  })

  const missing = lines.filter((line) => !line.match)
  if (missing.length > 0) message += `\n\nלא מצאתי בקטלוג: ${missing.map((line) => `"${line.query}"`).join(', ')}.`
  if (items.length > 0) {
    message += '\n\nבדוק את הכמויות ולחץ "הוסף הכול לעגלה". את ההזמנה שולחים מהעגלה.'
    actions.unshift({ label: items.length === 1 ? '➕ הוסף לעגלה' : `➕ הוסף הכול לעגלה (${items.length})`, action: 'add-all', items })
  }
  return { success: true, message, state: 'results_order', matchCount: found.length, actions }
}

/**
 * Products from the carpenter's recent orders, newest first, for
 * "כמו בפעם שעברה". Reads only this carpenter's orders.
 */
export async function getPreviousProducts(carpenterId: string, limit = 5) {
  const { data: orders, error } = await getSupabaseAdmin()
    .from('orders')
    .select('order_items (product_id, product_name_he, quantity)')
    .eq('carpenter_id', carpenterId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !orders) return []

  // The first time a product appears is its most recent order
  const seen = new Map<string, { product_id: string; product_name_he: string; quantity: number }>()
  for (const item of orders.flatMap((order) => order.order_items ?? [])) {
    if (item.product_id && !seen.has(item.product_id)) seen.set(item.product_id, { ...item, product_id: item.product_id })
  }
  return [...seen.values()].slice(0, limit)
}

export async function processProcurementRequest(request: ProcurementRequest): Promise<ProcurementResponse> {
  try {
    // "מה מצב ההצעות שלי", "הזמנה 1048 אושרה?": the carpentry's own rows, not a search
    const status = statusQuestion(request.userMessage)
    if (status) {
      const { message, actions } = await answerStatus(status, request.carpenterId)
      return { success: true, message, state: 'status', matchCount: 0, actions }
    }

    const [live, current] = await Promise.all([loadProducts({ showPrices: true, city: request.city ?? null }), loadCurrentPromo()])

    // "העדפה לספק X": that supplier's offer leads wherever it sells the product
    const preference = supplierPreference(
      request.userMessage,
      live.flatMap((product) => product.offers.map((offer) => offer.supplierName))
    )
    const preferredId = preference
      ? live.flatMap((product) => product.offers).find((offer) => offer.supplierName === preference.supplierName)?.supplierId ?? null
      : null
    const text = preference?.rest || request.userMessage

    // One product, matched on every word, is the common case. Only when the
    // whole sentence matches nothing fully is it read as several products.
    const whole = searchProducts(live, text)
    if (whole.partial || whole.products.length === 0) {
      const lines = findOrderLines(live, text, preferredId)
      if (lines) return orderLinesResponse(lines, preference?.supplierName ?? null, preferredId)
    }

    const written = parseQuantity(text)
    const { matches, total, partial, promo } = await findMatchingProducts(live, current, text, preferredId)
    if (promo && matches[0]?.promoted) {
      await recordPromoEvent({ weekId: promo.weekId, kind: 'view', placement: 'agent', carpenterId: request.carpenterId ?? null })
    }

    const state: ConversationState = matches.length === 0 ? 'no_results' : matches.length === 1 ? 'results_single' : 'results_multiple'
    let message = generateResponse(text, matches, { total, partial, written })
    if (preference && preferredId && matches.length === 1 && matches[0].offers[0]?.supplierId !== preferredId) {
      message += `\n\n${preference.supplierName} לא מציע את המוצר הזה, אז מוצג הספק שהקטלוג מציע.`
    }
    const actions: ActionButton[] = []

    if (state === 'results_multiple') {
      // The chat is stateless: the button carries the product, so choosing
      // it never goes back through search as the bare text "2"
      matches.slice(0, SHOW_LIMIT).forEach((product, i) => {
        actions.push({
          label: `${i + 1}) ${product.productName}`,
          action: `select-${i + 1}`,
          value: product.productId,
          item: cartItemOf(product, written),
        })
      })
    } else if (state === 'results_single') {
      const product = matches[0]
      const item = cartItemOf(product, written)
      // The agent only prepares: a quote-only product goes to its page, where
      // the carpenter asks for the quote and sends it.
      if (item?.quote_only) {
        actions.push({ label: 'בקש הצעת מחיר', action: 'open-page', value: `/app/product/${product.productId}?quote=1` })
      } else if (item) {
        actions.push({ label: '➕ הוסף לעגלה', action: 'add-to-cart', value: product.productId, item })
      }
      actions.push({ label: 'לדף המוצר', action: 'open-page', value: `/app/product/${product.productId}` })
      if (item) actions.push({ label: 'שאלה לספק', action: 'contact-supplier', value: item.supplier_id, item })
    }

    // The same words in the search bar show the full list
    if (matches.length === 0) {
      actions.push({ label: 'לקטלוג', action: 'open-page', value: '/app/catalog' })
    } else {
      actions.push({ label: 'כל התוצאות בקטלוג', action: 'open-catalog', value: request.userMessage })
    }

    return { success: true, message, state, matchCount: matches.length, actions }
  } catch (err) {
    console.error('Agent error:', err)
    return { success: false, message: 'קרתה שגיאה. נסה שוב בעוד רגע.', state: 'done', matchCount: 0, actions: [] }
  }
}
