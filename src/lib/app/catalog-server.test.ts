import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '@/test/fake-supabase'

// Two suppliers sell one product: S1 shows prices, S2 answers with quotes only.
// Both set a special-price threshold.
const offer = (id: string, supplierId: string, price: number, packQty: number) => ({
  id,
  supplier_id: supplierId,
  supplier_sku: null,
  price_excl_vat: price,
  stock_qty: 100,
  pack_label: 'מיכל',
  pack_qty: packQty,
  min_order_qty: 10,
  lead_time_days: null,
  suppliers: { status: 'approved', company_name: supplierId, logo_url: null, payment_terms: [], min_order_value_excl_vat: null, default_lead_time_days: null },
})
const thresholds = vi.hoisted(() => new Map<string, { minQty: number | null; setForPackQty: number | null }>())

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call) =>
      call.table === 'products'
        ? {
            data: [
              {
                id: 'p1',
                name_he: 'דבק',
                description_he: null,
                brand: null,
                mpn: null,
                base_unit: 'kg',
                image_url: null,
                attributes: null,
                category_id: null,
                supplier_offers: [offer('o1', 'S1', 50, 10), offer('o2', 'S2', 40, 10)],
              },
            ],
            error: null,
          }
        : { data: [], error: null }
    ).client,
}))
vi.mock('@/lib/price-mode', () => ({ loadPriceModes: async () => ({ ready: true, quoteOnly: new Set(['S2']) }) }))
vi.mock('@/lib/delivery', () => ({ loadDelivery: async () => ({ ready: true, bySupplier: new Map() }), deliversTo: () => null, regionsForCity: () => [] }))
vi.mock('@/lib/special-price', () => ({ loadThresholds: async () => thresholds }))

const { loadProducts } = await import('./catalog-server')

describe('loadProducts: prices and special-price thresholds', () => {
  it('never sends a quote-only supplier\'s price or threshold, and keeps the priced one\'s', async () => {
    thresholds.clear()
    thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    thresholds.set('o2', { minQty: 40, setForPackQty: 10 })
    const [product] = await loadProducts({ showPrices: true })
    const s1 = product.offers.find((o) => o.supplierId === 'S1')!
    const s2 = product.offers.find((o) => o.supplierId === 'S2')!
    expect(s1).toMatchObject({ price: 50, quoteOnly: false, specialMinQty: 40, minOrderQty: 10 })
    expect(s2).toMatchObject({ price: null, quoteOnly: true, specialMinQty: null, minOrderQty: 10 })
    // The quote-only price does not leak through which offer is suggested either.
    expect(s1.suggested).toBe(true)
  })

  it('hides every price from a viewer who may not see prices', async () => {
    const [product] = await loadProducts({ showPrices: false })
    expect(product.offers.every((o) => o.price === null)).toBe(true)
  })

  it('shows no special price while the pack differs from the one the threshold was set for', async () => {
    thresholds.clear()
    thresholds.set('o1', { minQty: 40, setForPackQty: 5 })
    const [product] = await loadProducts({ showPrices: true })
    expect(product.offers.find((o) => o.supplierId === 'S1')!.specialMinQty).toBeNull()
  })
})
