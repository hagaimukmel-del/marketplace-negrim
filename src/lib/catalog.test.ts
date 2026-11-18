import { describe, expect, it } from 'vitest'
import { bestOffer, isQuoteOffer, type Offer } from './catalog'

const offer = (id: string, price: number | null, stock = 10): Offer => ({
  id,
  supplier_id: `S-${id}`,
  supplier_sku: null,
  price_excl_vat: price,
  stock_qty: stock,
  pack_label: null,
  pack_qty: null,
  min_order_qty: 1,
  lead_time_days: null,
})

describe('bestOffer with offers listed without a price', () => {
  it('never lets an offer without a price win on price', () => {
    expect(bestOffer({ supplier_offers: [offer('a', null), offer('b', 30)] })?.id).toBe('b')
    expect(bestOffer({ supplier_offers: [offer('b', 30), offer('a', null)] })?.id).toBe('b')
  })

  it('still prefers stock, and returns the only offer even without a price', () => {
    expect(bestOffer({ supplier_offers: [offer('a', null), offer('b', 30, 0)] })?.id).toBe('a')
    expect(bestOffer({ supplier_offers: [offer('a', null)] })?.id).toBe('a')
  })
})

describe('isQuoteOffer', () => {
  it('is true for a quote-only supplier and for an offer without a price', () => {
    expect(isQuoteOffer({ supplier_id: 'S1', price_excl_vat: 20 }, new Set(['S1']))).toBe(true)
    expect(isQuoteOffer({ supplier_id: 'S1', price_excl_vat: null }, new Set())).toBe(true)
    expect(isQuoteOffer({ supplier_id: 'S1', price_excl_vat: 20 }, new Set())).toBe(false)
  })
})
