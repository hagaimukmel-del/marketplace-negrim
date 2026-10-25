/**
 * Quote requests (T-023), as both sides read them. Client-safe.
 *
 * A carpentry asks one supplier for a price on one product and quantity; the
 * supplier answers with a unit price excl. VAT and a date it holds until, or
 * declines. An answered quote goes into the cart as a line at that price and
 * quantity, and becomes a normal purchase order when the cart is sent.
 */

import type { QuoteKind } from './quote-rules'

export type QuoteStatus = 'requested' | 'quoted' | 'declined' | 'accepted' | 'rejected' | 'cancelled'

/** What the row says, plus "expired": an answer whose date has passed. */
export type QuoteState = QuoteStatus | 'expired'

export const QUOTE_STATE_LABEL: Record<QuoteState, string> = {
  requested: 'מחכה לתשובת הספק',
  quoted: 'התקבלה הצעה',
  declined: 'הספק לא הציע מחיר',
  accepted: 'הוזמן',
  rejected: 'לא התאים לך',
  cancelled: 'בוטלה',
  expired: 'פג תוקף',
}

/** The longest a supplier may hold a quoted price. */
export const QUOTE_MAX_VALID_DAYS = 90

export interface QuoteRequest {
  id: string
  createdAt: string
  productId: string
  productName: string
  unit: string
  supplierId: string
  supplierName: string
  /** In base units. */
  quantity: number
  note: string | null
  state: QuoteState
  /** Per base unit, excl. VAT; only once the supplier answered. */
  unitPrice: number | null
  validUntil: string | null
  supplierNote: string | null
  orderId: string | null
  packLabel: string | null
  packQty: number | null
  /** What was asked for; null on requests from before migration 20261012090000. */
  kind: QuoteKind | null
  /** The conversation about this request; null on requests from before migration 20261025140000. */
  threadId?: string | null
}

/** How a request's kind reads; requests without one show no label. */
export const QUOTE_KIND_LABEL: Record<QuoteKind, string> = {
  quote: 'הצעת מחיר',
  volume: 'מחיר מיוחד לכמות',
}

/** A request as the supplier sees it: who asked. */
export interface SupplierQuoteRequest extends QuoteRequest {
  carpenter: string
  contactName: string | null
  phone: string | null
  city: string | null
}

/** Today's date in Israel, YYYY-MM-DD. */
export function israelDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now)
}

export function stateOf(status: string, validUntil: string | null, today: string = israelDate()): QuoteState {
  if (status === 'quoted' && validUntil && validUntil < today) return 'expired'
  return (Object.keys(QUOTE_STATE_LABEL) as QuoteState[]).includes(status as QuoteState) ? (status as QuoteState) : 'requested'
}

/** "עד 14.11" for a validity date. */
export function validLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(day)}.${Number(month)}`
}

/** "4 × דלי (100 ק״ג)", or "35 ק״ג" when it is not whole packs. */
export function quantityText(quantity: number, unit: string, packLabel: string | null, packQty: number | null): string {
  const amount = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2)
  if (packQty && packQty > 1 && Number.isInteger(quantity / packQty)) {
    return `${quantity / packQty} × ${packLabel ?? 'אריזה'} (${amount} ${unit})`
  }
  return `${amount} ${unit}`
}
