/**
 * The rules for asking a supplier for a price (stage 1 of the 2026-10-12
 * RFQ plan). Pure functions with no database access, so the API routes, the
 * screens and the tests all read the same rules. Client-safe.
 *
 * Two kinds of request:
 * - 'quote':  the supplier shows no prices (price_mode 'quote'); asking is the
 *             way to buy. Only the offer's minimum order applies. If this
 *             supplier also set a special-price threshold, a request from that
 *             quantity up is a 'volume' request instead; below it, a 'quote'.
 * - 'volume': the supplier shows prices and set a special-price threshold on
 *             this offer; a carpentry may ask for a special price from that
 *             quantity up. No threshold, no special price.
 *
 * Quantities are in the product's base unit, like supplier_offers.min_order_qty
 * and quote_requests.quantity. The supplier sets the threshold in packs and it
 * is stored as base units together with the pack size it was set for
 * (special_price_pack_qty). If the pack size changes afterwards, the threshold
 * is not reinterpreted: it stays out of use until the supplier confirms it.
 */

export type QuoteKind = 'quote' | 'volume'

/** What one supplier offer says about special prices. */
export interface ThresholdFields {
  /** supplier_offers.special_price_min_qty, base units. */
  minQty: number | null
  /** supplier_offers.special_price_pack_qty: the pack size the threshold was set for. */
  setForPackQty: number | null
}

const EPSILON = 1e-6

/** Pack size as a step: a missing or non-positive pack is one base unit. */
function packStep(packQty: number | null | undefined): number {
  return packQty != null && packQty > 0 ? packQty : 1
}

/** Two pack sizes are the same step (a missing pack is one base unit). */
export function samePack(a: number | null | undefined, b: number | null | undefined): boolean {
  return Math.abs(packStep(a) - packStep(b)) < EPSILON
}

function isWholeMultiple(value: number, step: number): boolean {
  const ratio = value / step
  return Math.abs(ratio - Math.round(ratio)) < EPSILON
}

/**
 * The threshold a carpentry may ask from, or null when there is none or when
 * the pack size changed since the supplier set it (then it waits for the
 * supplier to confirm it again).
 */
export function activeThreshold(threshold: ThresholdFields | null | undefined, currentPackQty: number | null): number | null {
  if (!threshold || threshold.minQty == null || threshold.minQty <= 0) return null
  if (!samePack(threshold.setForPackQty, currentPackQty)) return null
  return threshold.minQty
}

/** A threshold exists but the pack size changed under it. */
export function thresholdNeedsReview(threshold: ThresholdFields | null | undefined, currentPackQty: number | null): boolean {
  return Boolean(threshold && threshold.minQty != null && threshold.minQty > 0 && !samePack(threshold.setForPackQty, currentPackQty))
}

/**
 * Check a threshold a supplier is saving against the offer's pack and minimum
 * order, as they will be after the same save. Returns an error in Hebrew, or
 * null when it is fine.
 */
export function validateThreshold(input: { minQty: number; packQty: number | null; minOrderQty: number }): string | null {
  const { minQty, packQty, minOrderQty } = input
  if (!Number.isFinite(minQty) || minQty <= 0) return 'סף המחיר המיוחד צריך להיות גדול מאפס'
  if (minQty > 1_000_000) return 'סף המחיר המיוחד גדול מדי'
  if (!isWholeMultiple(minQty, packStep(packQty))) return 'סף המחיר המיוחד צריך להיות מספר שלם של אריזות'
  if (minQty + EPSILON < minOrderQty) return 'סף המחיר המיוחד לא יכול להיות נמוך מכמות המינימום להזמנה'
  return null
}

export type QuoteCheck = { ok: true; kind: QuoteKind } | { ok: false; status: 400; code: string; error: string }

/**
 * May this carpentry send this request to this supplier? The server's answer;
 * the screens only hide what this would refuse anyway.
 *
 * `quantityLabel` formats a base-unit quantity for the message ("4 × מיכל (40 ק״ג)").
 */
export function checkQuoteRequest(input: {
  quoteOnly: boolean
  quantity: number
  minOrderQty: number
  packQty: number | null
  threshold: ThresholdFields | null
  quantityLabel?: (quantity: number) => string
}): QuoteCheck {
  const label = input.quantityLabel ?? ((q: number) => String(q))
  if (!Number.isInteger(input.quantity) || input.quantity <= 0 || input.quantity > 1_000_000) {
    return { ok: false, status: 400, code: 'quantity_invalid', error: 'כמות לא תקינה' }
  }
  if (input.quoteOnly) {
    const min = input.minOrderQty > 0 ? input.minOrderQty : 1
    if (input.quantity + EPSILON < min) {
      return { ok: false, status: 400, code: 'below_min_order', error: `כמות המינימום להזמנה אצל הספק: ${label(min)}` }
    }
    // The threshold never blocks a quote-only request; it only marks one that reaches it.
    const special = activeThreshold(input.threshold, input.packQty)
    return { ok: true, kind: special != null && input.quantity + EPSILON >= special ? 'volume' : 'quote' }
  }
  const min = activeThreshold(input.threshold, input.packQty)
  if (min == null) {
    return { ok: false, status: 400, code: 'no_special_price', error: 'הספק לא מציע מחיר מיוחד לכמות על המוצר הזה' }
  }
  if (input.quantity + EPSILON < min) {
    return { ok: false, status: 400, code: 'below_threshold', error: `מחיר מיוחד מ־${label(min)}` }
  }
  return { ok: true, kind: 'volume' }
}

/** The fields that make two sends "the same request". */
export interface RequestIdentity {
  supplierId: string
  productId: string
  quantity: number
  note: string | null
}

/**
 * A repeated client_request_id returns the existing request only when it asks
 * for the same thing; anything else is a conflict, never a silent overwrite.
 */
export function sameRequest(a: RequestIdentity, b: RequestIdentity): boolean {
  return (
    a.supplierId === b.supplierId &&
    a.productId === b.productId &&
    Math.abs(Number(a.quantity) - Number(b.quantity)) < EPSILON &&
    (a.note ?? '') === (b.note ?? '')
  )
}

export type ThresholdChange =
  | { ok: true; fields: { special_price_min_qty: number | null; special_price_pack_qty: number | null } | null }
  | { ok: false; status: number; code: string; error: string }

/**
 * What a supplier's save does to the threshold of one of its own offers.
 *
 * Every save that touches the threshold, the pack size or the minimum order is
 * checked against the offer as it will be after the save:
 * - the threshold is sent: it is validated and stored with the pack size it
 *   was set for (empty clears it);
 * - only the pack size changes under an existing threshold: refused, so the
 *   supplier sees and confirms what the threshold now means;
 * - only the minimum order rises above an existing threshold: refused.
 *
 * `current` is the offer before the save; `next` holds the pack and minimum
 * from this save, undefined when the save leaves them alone.
 */
export function thresholdChange(
  body: Record<string, unknown>,
  current: { packQty: number | null; minOrderQty: number; threshold: ThresholdFields | null },
  next: { packQty?: number | null; minOrderQty?: number }
): ThresholdChange {
  const packQty = next.packQty !== undefined ? next.packQty : current.packQty
  const minOrderQty = next.minOrderQty !== undefined ? next.minOrderQty : current.minOrderQty

  if ('special_price_min_qty' in body) {
    const raw = body.special_price_min_qty
    if (raw === null || raw === '' || raw === undefined) {
      // Clearing a threshold that is not there writes nothing.
      return current.threshold?.minQty != null
        ? { ok: true, fields: { special_price_min_qty: null, special_price_pack_qty: null } }
        : { ok: true, fields: null }
    }
    const minQty = Number(raw)
    const error = validateThreshold({ minQty, packQty, minOrderQty })
    if (error) return { ok: false, status: 400, code: 'threshold_invalid', error }
    return { ok: true, fields: { special_price_min_qty: minQty, special_price_pack_qty: packQty } }
  }

  const existing = current.threshold
  if (!existing || existing.minQty == null) return { ok: true, fields: null }

  if (next.packQty !== undefined && !samePack(next.packQty, current.packQty)) {
    return {
      ok: false,
      status: 409,
      code: 'threshold_review',
      error: 'שיניתם את גודל האריזה. אשרו מחדש את סף המחיר המיוחד לכמות, או מחקו אותו.',
    }
  }
  // A threshold already waiting for review is out of use; it is checked again when confirmed.
  if (!thresholdNeedsReview(existing, current.packQty) && existing.minQty + 1e-6 < minOrderQty) {
    return {
      ok: false,
      status: 400,
      code: 'threshold_invalid',
      error: 'סף המחיר המיוחד לא יכול להיות נמוך מכמות המינימום להזמנה. עדכנו גם את הסף.',
    }
  }
  return { ok: true, fields: null }
}
