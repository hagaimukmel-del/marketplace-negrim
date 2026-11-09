/**
 * Weeks for "מוצר השבוע" (T-024), safe for both server and browser.
 *
 * A week is named by its Sunday, as a YYYY-MM-DD date in Israel: the Israeli
 * working week, and the value stored in promo_weeks.week_start.
 */

export type PromoStatus = 'requested' | 'approved' | 'rejected' | 'cancelled'

export const PROMO_STATUS_LABEL: Record<PromoStatus, string> = {
  requested: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
  cancelled: 'בוטל',
}

/** How far ahead a supplier may book. */
export const PROMO_BOOKING_WEEKS = 12

export interface PromoResults {
  views: number
  viewers: number
  adds: number
  orders: number
  amount: number
}

export interface PromoWeek {
  id: string
  weekStart: string
  supplierId: string
  supplierName: string | null
  productId: string
  productName: string | null
  status: PromoStatus
  price: number
  note: string | null
  /** The supplier's price shows on the card. */
  showPrice: boolean
  results: PromoResults | null
}

/** Today's date in Israel as YYYY-MM-DD. */
export function israelToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
}

function parse(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + days)
  return format(d)
}

/** The Sunday that starts the week holding this date. */
export function weekStartOf(date: string): string {
  return addDays(date, -parse(date).getUTCDay())
}

export function isSunday(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && parse(date).getUTCDay() === 0 && format(parse(date)) === date
}

/** The week running now, in Israel. */
export function currentWeek(now: Date = new Date()): string {
  return weekStartOf(israelToday(now))
}

/**
 * "12.10–18.10", isolated left-to-right: inside Hebrew text the bidi algorithm
 * would otherwise show the end date first.
 */
export function weekLabel(weekStart: string): string {
  const short = (date: string) => `${Number(date.slice(8, 10))}.${Number(date.slice(5, 7))}`
  return `\u2066${short(weekStart)}–${short(addDays(weekStart, 6))}\u2069`
}

/** The weeks a supplier can book: from next week, PROMO_BOOKING_WEEKS ahead. */
export function bookableWeeks(now: Date = new Date()): string[] {
  const next = addDays(currentWeek(now), 7)
  return Array.from({ length: PROMO_BOOKING_WEEKS }, (_, i) => addDays(next, i * 7))
}

/**
 * The last day a booked week can be cancelled: the Thursday before its Sunday
 * (owner, 2026-11-09; supplier annex). After it the week is owed in full.
 */
export function cancelDeadline(weekStart: string): string {
  return addDays(weekStart, -3)
}

/**
 * Whether the supplier may still cancel a booking. A request not yet decided
 * can always be withdrawn; an approved week until its cancelDeadline, in
 * Israel's date.
 */
export function canCancelPromo(status: PromoStatus, weekStart: string, now: Date = new Date()): boolean {
  if (status === 'requested') return true
  if (status === 'approved') return israelToday(now) <= cancelDeadline(weekStart)
  return false
}
