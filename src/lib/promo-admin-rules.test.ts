import { describe, expect, it } from 'vitest'
import { adminPromoWeeks, parseAdminPromoCreate, parseAdminPromoEdit } from './promo-admin-rules'
import { PROMO_WEEK_EXCL_VAT } from './supplier-plans'

// Wednesday 11.11.2026 in Israel: the week runs from Sunday 8.11.
const now = new Date('2026-11-11T10:00:00Z')

describe('adminPromoWeeks', () => {
  it('starts with the week running now, then the 12 a supplier can book', () => {
    const weeks = adminPromoWeeks(now)
    expect(weeks[0]).toBe('2026-11-08')
    expect(weeks[1]).toBe('2026-11-15')
    expect(weeks).toHaveLength(13)
  })
})

describe('parseAdminPromoCreate', () => {
  const base = { supplier_id: 's1', product_id: 'p1', week_start: '2026-11-08' }

  it('accepts this week and defaults to the list price, no price on the card', () => {
    const parsed = parseAdminPromoCreate(base, now)
    expect(parsed).toEqual({
      ok: true,
      value: { supplierId: 's1', productId: 'p1', weekStart: '2026-11-08', showPrice: false, price: PROMO_WEEK_EXCL_VAT, note: null, replace: false },
    })
  })

  it('takes a price given by hand, including a free week', () => {
    const parsed = parseAdminPromoCreate({ ...base, price_excl_vat: '0' }, now)
    expect(parsed.ok && parsed.value.price).toBe(0)
  })

  it('refuses a past week, a week too far ahead and a day that is not Sunday', () => {
    for (const week_start of ['2026-11-01', '2027-02-14', '2026-11-10']) {
      expect(parseAdminPromoCreate({ ...base, week_start }, now).ok).toBe(false)
    }
  })

  it('refuses a missing supplier or product and a negative price', () => {
    expect(parseAdminPromoCreate({ ...base, supplier_id: '' }, now).ok).toBe(false)
    expect(parseAdminPromoCreate({ ...base, product_id: undefined }, now).ok).toBe(false)
    expect(parseAdminPromoCreate({ ...base, price_excl_vat: -5 }, now).ok).toBe(false)
  })

  it('replaces only when asked in so many words', () => {
    const parsed = parseAdminPromoCreate({ ...base, replace: 'yes' }, now)
    expect(parsed.ok && parsed.value.replace).toBe(false)
  })
})

describe('parseAdminPromoEdit', () => {
  it('keeps only the fields that were sent', () => {
    expect(parseAdminPromoEdit({ id: 'w1', show_price: true }, now)).toEqual({ ok: true, value: { id: 'w1', showPrice: true } })
  })

  it('refuses an edit with nothing to change', () => {
    expect(parseAdminPromoEdit({ id: 'w1' }, now).ok).toBe(false)
  })

  it('refuses a week outside the range and a non-boolean show_price', () => {
    expect(parseAdminPromoEdit({ id: 'w1', week_start: '2026-11-01' }, now).ok).toBe(false)
    expect(parseAdminPromoEdit({ id: 'w1', show_price: 'true' }, now).ok).toBe(false)
  })
})
