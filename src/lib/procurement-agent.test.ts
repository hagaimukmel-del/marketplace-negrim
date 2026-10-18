import { describe, expect, it, vi } from 'vitest'
import type { AppOffer, AppProduct } from './app/products'

const offer = (supplierName: string, price: number | null, packQty: number | null, extra: Partial<AppOffer> = {}): AppOffer => ({
  supplierId: `id-${supplierName}`,
  supplierName,
  supplierLogo: null,
  price,
  quoteOnly: price == null,
  packLabel: 'דלי',
  packQty,
  inStock: true,
  leadDays: 2,
  terms: [],
  minOrder: null,
  minOrderQty: 1,
  specialMinQty: null,
  delivers: null,
  suggested: false,
  ...extra,
})

const product = (id: string, name: string, baseUnit: string, offers: AppOffer[]): AppProduct => ({
  id,
  name,
  brand: null,
  mpn: null,
  baseUnit,
  unit: baseUnit === 'kg' ? 'ק״ג' : 'יח׳',
  imageUrl: null,
  attributes: [],
  categoryId: null,
  icon: null,
  topId: null,
  subId: null,
  description: null,
  offers,
})

const CATALOGUE: AppProduct[] = [
  // The catalogue suggests גלעד: it delivers to the carpentry, the cheaper דרום does not
  product('pur', 'דבק PUR לקנטים', 'kg', [
    offer('דרום', 20, 5, { delivers: false }),
    offer('גלעד', 24, 5, { delivers: true, suggested: true }),
  ]),
  product('board', 'לוח מלמין לבן 18 מ״מ', 'unit', [offer('עצי השרון', 180, 1, { suggested: true }), offer('גלעד', 175, 1)]),
  product('hinge', 'ציר בלום קליפ טופ', 'unit', [offer('גלעד', 9.5, 10, { suggested: true })]),
  product('hinge2', 'ציר בלום 110 מעלות', 'unit', [offer('גלעד', 11, 10, { suggested: true })]),
  product('acrylic', 'סיליקון אקרילי לבן', 'unit', [offer('גלעד', null, 12, { suggested: true })]),
]

vi.mock('@/lib/app/catalog-server', () => ({ loadProducts: async () => CATALOGUE }))
vi.mock('@/lib/promo', () => ({ loadCurrentPromo: async () => null, recordPromoEvent: async () => undefined }))
// Order #1048 belongs to this carpenter; any other number is someone else's or none
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    const filters: Record<string, unknown> = {}
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => ((filters[column] = value), chain),
      order: () => chain,
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({
        data:
          filters.carpenter_id === 'c1' && filters.short_number === 1048
            ? { id: 'o1', short_number: 1048, status: 'confirmed', suppliers: { company_name: 'גלעד' } }
            : null,
        error: null,
      }),
    }
    return { from: () => chain }
  },
}))
vi.mock('@/lib/quotes-server', () => ({
  loadCarpenterQuotes: async () => ({
    ready: true,
    quotes: [
      { productName: 'דבק PUR לקנטים', supplierName: 'גלעד', state: 'quoted', unitPrice: 21.5, unit: 'ק״ג', validUntil: '2026-11-14' },
      { productName: 'לכה', supplierName: 'דרום', state: 'requested', unitPrice: null, unit: 'ליטר', validUntil: null },
    ],
  }),
}))

const { processProcurementRequest } = await import('./procurement-agent')
const ask = (userMessage: string) => processProcurementRequest({ userMessage, carpenterId: 'c1', city: 'חיפה' })

describe('processProcurementRequest', () => {
  it('suggests the same supplier as the catalogue and marks one that does not deliver', async () => {
    const answer = await ask('דבק PUR')
    expect(answer.state).toBe('results_single')
    const add = answer.actions.find((action) => action.action === 'add-to-cart')
    expect(add?.item).toMatchObject({ supplier_name: 'גלעד', base_price_excl_vat: 24, quantity: 5 })
    expect(answer.message).toContain('דרום')
    expect(answer.message).toContain('לא מגיע לאזור שלך')
  })

  it('puts a written quantity in the cart, in whole packs', async () => {
    const answer = await ask('דבק PUR 12 ק״ג')
    expect(answer.actions.find((action) => action.action === 'add-to-cart')?.item?.quantity).toBe(15)
    expect(answer.message).toContain('כמות לעגלה: 15 ק״ג')
  })

  it('reads several products, a shared quantity and a preferred supplier in one sentence', async () => {
    const answer = await ask('הזמן לי לוח לבן וצירים קליפ, 20 יחידות, העדפה לספק גלעד')
    expect(answer.state).toBe('results_order')
    const all = answer.actions.find((action) => action.action === 'add-all')
    expect(all?.items).toEqual([
      expect.objectContaining({ id: 'board', supplier_name: 'גלעד', quantity: 20 }),
      expect.objectContaining({ id: 'hinge', supplier_name: 'גלעד', quantity: 20 }),
    ])
  })

  it('reports a part it cannot find and keeps the rest', async () => {
    const answer = await ask('דבק PUR, מסור עגול')
    expect(answer.state).toBe('results_order')
    expect(answer.message).toContain('לא מצאתי בקטלוג: "מסור עגול"')
    expect(answer.actions.find((action) => action.action === 'add-all')?.items).toHaveLength(1)
  })

  it('offers the other matches of a part, and leaves a quote-only product out of the cart', async () => {
    const answer = await ask('ציר בלום וסיליקון אקרילי')
    expect(answer.state).toBe('results_order')
    expect(answer.actions.some((action) => action.action === 'ask' && action.value === 'ציר בלום')).toBe(true)
    const items = answer.actions.find((action) => action.action === 'add-all')?.items ?? []
    expect(items).toHaveLength(1)
    expect(items[0].id).toMatch(/^hinge/)
    expect(answer.actions.some((action) => action.value === '/app/product/acrylic?quote=1')).toBe(true)
  })

  it('keeps a supplier name without a preference word as a search word', async () => {
    const answer = await ask('לוח לבן עצי השרון')
    expect(answer.state).toBe('results_single')
    expect(answer.actions.find((action) => action.action === 'add-to-cart')?.item?.supplier_name).toBe('עצי השרון')
  })

  it('says when the preferred supplier does not sell the product', async () => {
    const answer = await ask('לוח לבן, מעדיף את דרום')
    expect(answer.message).toContain('דרום לא מציע את המוצר הזה')
  })
})

describe('status questions', () => {
  it('answers an order number from the carpenter\'s own orders', async () => {
    const answer = await ask('הזמנה 1048 אושרה?')
    expect(answer.state).toBe('status')
    expect(answer.message).toBe('הזמנה #1048 מגלעד: אושרה.')
    expect(answer.actions[0].value).toBe('/app/orders/o1')
    expect((await ask('הזמנה 999 אושרה?')).message).toContain('לא מצאתי אצלך הזמנה #999')
  })

  it('lists quote requests with the quoted price', async () => {
    const answer = await ask('מה מצב ההצעות שלי')
    expect(answer.message).toContain('יש לך הצעה אחת שנענתה')
    expect(answer.message).toContain('₪21.50 לק״ג לפני מע״מ · בתוקף עד 14.11')
    expect(answer.message).toContain('מחכה לתשובת הספק')
  })
})
