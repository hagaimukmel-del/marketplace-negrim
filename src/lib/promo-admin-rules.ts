/**
 * The operator sets "מוצר השבוע" by hand, at a supplier's request (T-024).
 *
 * Pure rules for /api/admin/promo PUT (a new booking) and PATCH (changing
 * one), kept apart from the route so they can be tested without a database.
 * The operator may also set the week running now, which a supplier cannot
 * book: a supplier who calls on Monday and asks for this week gets it.
 */

import { PROMO_WEEK_EXCL_VAT } from '@/lib/supplier-plans'
import { bookableWeeks, currentWeek, isSunday } from '@/lib/promo-weeks'

/** This week and the weeks a supplier could book. */
export function adminPromoWeeks(now: Date = new Date()): string[] {
  return [currentWeek(now), ...bookableWeeks(now)]
}

export interface AdminPromoCreate {
  supplierId: string
  productId: string
  weekStart: string
  showPrice: boolean
  price: number
  note: string | null
  /** Cancel the booking that holds the week, if there is one, and take its place. */
  replace: boolean
}

export interface AdminPromoEdit {
  id: string
  productId?: string
  weekStart?: string
  showPrice?: boolean
  price?: number
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const WEEK_ERROR = 'אפשר לבחור את השבוע הנוכחי ועד 12 שבועות קדימה'
const PRICE_ERROR = 'מחיר לא תקין'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** A price in shekels excl. VAT, 0 allowed (a week given free), two decimals. */
function price(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null
  return Math.round(n * 100) / 100
}

function week(value: unknown, now: Date): string | null {
  const w = text(value)
  return isSunday(w) && adminPromoWeeks(now).includes(w) ? w : null
}

export function parseAdminPromoCreate(body: Record<string, unknown>, now: Date = new Date()): Parsed<AdminPromoCreate> {
  const supplierId = text(body.supplier_id)
  const productId = text(body.product_id)
  if (!supplierId || !productId) return { ok: false, error: 'צריך לבחור ספק ומוצר' }
  const weekStart = week(body.week_start, now)
  if (!weekStart) return { ok: false, error: WEEK_ERROR }
  const p = body.price_excl_vat === undefined || body.price_excl_vat === '' ? PROMO_WEEK_EXCL_VAT : price(body.price_excl_vat)
  if (p === null) return { ok: false, error: PRICE_ERROR }
  return {
    ok: true,
    value: {
      supplierId,
      productId,
      weekStart,
      showPrice: body.show_price === true,
      price: p,
      note: text(body.note).slice(0, 300) || null,
      replace: body.replace === true,
    },
  }
}

export function parseAdminPromoEdit(body: Record<string, unknown>, now: Date = new Date()): Parsed<AdminPromoEdit> {
  const id = text(body.id)
  if (!id) return { ok: false, error: 'חסר מזהה' }
  const value: AdminPromoEdit = { id }
  if (body.product_id !== undefined) {
    const productId = text(body.product_id)
    if (!productId) return { ok: false, error: 'צריך לבחור מוצר' }
    value.productId = productId
  }
  if (body.week_start !== undefined) {
    const weekStart = week(body.week_start, now)
    if (!weekStart) return { ok: false, error: WEEK_ERROR }
    value.weekStart = weekStart
  }
  if (body.show_price !== undefined) {
    if (typeof body.show_price !== 'boolean') return { ok: false, error: 'בקשה לא תקינה' }
    value.showPrice = body.show_price
  }
  if (body.price_excl_vat !== undefined) {
    const p = price(body.price_excl_vat)
    if (p === null) return { ok: false, error: PRICE_ERROR }
    value.price = p
  }
  if (Object.keys(value).length === 1) return { ok: false, error: 'אין מה לשנות' }
  return { ok: true, value }
}
