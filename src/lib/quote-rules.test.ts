import { describe, expect, it } from 'vitest'
import { activeThreshold, checkQuoteRequest, sameRequest, thresholdChange, thresholdNeedsReview, validateThreshold } from './quote-rules'

const label = (q: number) => `${q / 10} × מיכל (${q} ק״ג)`

describe('checkQuoteRequest', () => {
  const base = { quantity: 40, minOrderQty: 10, packQty: 10, quantityLabel: label }

  it('lets a quote-only supplier be asked from its minimum order, ignoring any threshold', () => {
    expect(checkQuoteRequest({ ...base, quoteOnly: true, threshold: { minQty: 100, setForPackQty: 10 } })).toEqual({ ok: true, kind: 'quote' })
    expect(checkQuoteRequest({ ...base, quoteOnly: true, quantity: 10, threshold: null })).toEqual({ ok: true, kind: 'quote' })
  })

  it('refuses a quote-only request below the minimum order', () => {
    const result = checkQuoteRequest({ ...base, quoteOnly: true, quantity: 5, threshold: null })
    expect(result).toMatchObject({ ok: false, status: 400, code: 'below_min_order' })
  })

  it('offers no special price when a priced supplier set no threshold', () => {
    const result = checkQuoteRequest({ ...base, quoteOnly: false, quantity: 1000, threshold: null })
    expect(result).toMatchObject({ ok: false, status: 400, code: 'no_special_price' })
  })

  it('refuses below the threshold and says it in packs', () => {
    const result = checkQuoteRequest({ ...base, quoteOnly: false, quantity: 30, threshold: { minQty: 40, setForPackQty: 10 } })
    expect(result).toMatchObject({ ok: false, code: 'below_threshold' })
    if (!result.ok) expect(result.error).toContain('4 × מיכל (40 ק״ג)')
  })

  it('accepts at or above the threshold as a volume request', () => {
    expect(checkQuoteRequest({ ...base, quoteOnly: false, quantity: 40, threshold: { minQty: 40, setForPackQty: 10 } })).toEqual({ ok: true, kind: 'volume' })
    expect(checkQuoteRequest({ ...base, quoteOnly: false, quantity: 90, threshold: { minQty: 40, setForPackQty: 10 } })).toEqual({ ok: true, kind: 'volume' })
  })

  it('treats a threshold set for another pack size as no threshold', () => {
    const result = checkQuoteRequest({ ...base, quoteOnly: false, packQty: 25, quantity: 100, threshold: { minQty: 40, setForPackQty: 10 } })
    expect(result).toMatchObject({ ok: false, code: 'no_special_price' })
  })

  it('refuses a quantity that is not a whole positive number', () => {
    for (const quantity of [0, -4, 2.5, Number.NaN, 2_000_000]) {
      expect(checkQuoteRequest({ ...base, quoteOnly: true, quantity, threshold: null })).toMatchObject({ ok: false, code: 'quantity_invalid' })
    }
  })
})

describe('validateThreshold', () => {
  it('accepts whole packs at or above the minimum order', () => {
    expect(validateThreshold({ minQty: 40, packQty: 10, minOrderQty: 10 })).toBeNull()
    expect(validateThreshold({ minQty: 40, packQty: 10, minOrderQty: 40 })).toBeNull()
  })

  it('refuses a threshold that is not whole packs', () => {
    expect(validateThreshold({ minQty: 45, packQty: 10, minOrderQty: 1 })).toMatch(/אריזות/)
  })

  it('refuses a threshold below the minimum order', () => {
    expect(validateThreshold({ minQty: 20, packQty: 10, minOrderQty: 30 })).toMatch(/מינימום/)
  })

  it('treats no pack as one unit', () => {
    expect(validateThreshold({ minQty: 7, packQty: null, minOrderQty: 1 })).toBeNull()
    expect(validateThreshold({ minQty: 7.5, packQty: null, minOrderQty: 1 })).toMatch(/אריזות/)
  })

  it('refuses zero, negatives and nonsense', () => {
    for (const minQty of [0, -10, Number.NaN, 5_000_000]) {
      expect(validateThreshold({ minQty, packQty: 1, minOrderQty: 1 })).not.toBeNull()
    }
  })
})

describe('activeThreshold', () => {
  it('is the threshold while the pack is the one it was set for', () => {
    expect(activeThreshold({ minQty: 40, setForPackQty: 10 }, 10)).toBe(40)
    expect(activeThreshold({ minQty: 7, setForPackQty: null }, null)).toBe(7)
    expect(activeThreshold({ minQty: 7, setForPackQty: null }, 1)).toBe(7)
  })

  it('stops, without being reinterpreted, when the pack size changes', () => {
    expect(activeThreshold({ minQty: 40, setForPackQty: 10 }, 25)).toBeNull()
    expect(thresholdNeedsReview({ minQty: 40, setForPackQty: 10 }, 25)).toBe(true)
    expect(thresholdNeedsReview({ minQty: 40, setForPackQty: 10 }, 10)).toBe(false)
  })

  it('is null without a threshold', () => {
    expect(activeThreshold(null, 10)).toBeNull()
    expect(activeThreshold({ minQty: null, setForPackQty: null }, 10)).toBeNull()
  })
})

describe('thresholdChange (supplier saves)', () => {
  const current = { packQty: 10, minOrderQty: 10, threshold: { minQty: 40, setForPackQty: 10 } }

  it('stores a new threshold with the pack size it was set for', () => {
    const change = thresholdChange({ special_price_min_qty: '50' }, current, {})
    expect(change).toEqual({ ok: true, fields: { special_price_min_qty: 50, special_price_pack_qty: 10 } })
  })

  it('checks a threshold against the pack and minimum of the same save', () => {
    // 60 is not whole packs of 25.
    expect(thresholdChange({ special_price_min_qty: '60' }, current, { packQty: 25 })).toMatchObject({ ok: false, code: 'threshold_invalid' })
    // 50 is two packs of 25, but under a minimum order of 75 saved with it.
    expect(thresholdChange({ special_price_min_qty: '50' }, current, { packQty: 25, minOrderQty: 75 })).toMatchObject({ ok: false, code: 'threshold_invalid' })
    expect(thresholdChange({ special_price_min_qty: '100' }, current, { packQty: 25 })).toEqual({
      ok: true,
      fields: { special_price_min_qty: 100, special_price_pack_qty: 25 },
    })
    expect(thresholdChange({ special_price_min_qty: '40' }, current, { minOrderQty: 50 })).toMatchObject({ ok: false, code: 'threshold_invalid' })
  })

  it('refuses a pack change under a threshold that was not confirmed in the same save', () => {
    expect(thresholdChange({ pack_qty: '25' }, current, { packQty: 25 })).toMatchObject({ ok: false, status: 409, code: 'threshold_review' })
  })

  it('lets the pack change when the pack stays the same or there is no threshold', () => {
    expect(thresholdChange({}, current, { packQty: 10 })).toEqual({ ok: true, fields: null })
    expect(thresholdChange({}, { ...current, threshold: null }, { packQty: 25 })).toEqual({ ok: true, fields: null })
  })

  it('refuses raising the minimum order above an existing threshold', () => {
    expect(thresholdChange({}, current, { minOrderQty: 50 })).toMatchObject({ ok: false, code: 'threshold_invalid' })
    expect(thresholdChange({}, current, { minOrderQty: 40 })).toEqual({ ok: true, fields: null })
  })

  it('clears a threshold, and writes nothing when there is none to clear', () => {
    expect(thresholdChange({ special_price_min_qty: '' }, current, {})).toEqual({
      ok: true,
      fields: { special_price_min_qty: null, special_price_pack_qty: null },
    })
    expect(thresholdChange({ special_price_min_qty: '' }, { ...current, threshold: null }, {})).toEqual({ ok: true, fields: null })
  })
})

describe('sameRequest', () => {
  const a = { supplierId: 's', productId: 'p', quantity: 40, note: 'עד חמישי' }
  it('matches on supplier, product, quantity and note', () => {
    expect(sameRequest(a, { ...a })).toBe(true)
    expect(sameRequest(a, { ...a, quantity: 50 })).toBe(false)
    expect(sameRequest(a, { ...a, note: null })).toBe(false)
    expect(sameRequest(a, { ...a, supplierId: 'other' })).toBe(false)
    expect(sameRequest({ ...a, note: null }, { ...a, note: '' })).toBe(true)
  })
})
