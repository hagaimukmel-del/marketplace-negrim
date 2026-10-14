import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, filterValue, type FakeCall } from '@/test/fake-supabase'
import type { ThresholdFields } from '@/lib/quote-rules'

// What the database and the session hold for each test.
const db = vi.hoisted(() => ({
  priceMode: 'shown' as 'shown' | 'quote' | null,
  thresholds: new Map<string, { minQty: number | null; setForPackQty: number | null; price?: number | null }>(),
  offer: null as Record<string, unknown> | null,
  quotes: [] as Record<string, unknown>[],
  calls: [] as unknown[],
}))
const sendEmail = vi.hoisted(() => vi.fn(async () => ({ sent: true })))

vi.mock('@/lib/carpenter-auth', () => ({
  getSessionCarpenter: async () => ({ id: 'c1', business_name: 'נגריית בדיקה', contact_name: null, city: null }),
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock('@/lib/email', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/email')>()), sendEmail }))
vi.mock('@/lib/price-mode', () => ({ priceModeOf: async () => db.priceMode }))
vi.mock('@/lib/special-price', () => ({
  loadThresholds: async () => db.thresholds as Map<string, ThresholdFields>,
}))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    const { client, calls } = fakeSupabase((call: FakeCall) => {
      if (call.table === 'supplier_offers') return { data: db.offer, error: null }
      if (call.table === 'quote_requests' && call.op === 'select') {
        const found = db.quotes.find(
          (row) => row.carpenter_id === filterValue(call, 'eq', 'carpenter_id') && row.client_request_id === filterValue(call, 'eq', 'client_request_id')
        )
        return { data: found ?? null, error: null }
      }
      if (call.table === 'quote_requests' && call.op === 'update') {
        const row = db.quotes.find((q) => q.id === filterValue(call, 'eq', 'id') && (q.status ?? 'requested') === filterValue(call, 'eq', 'status'))
        if (!row) return { data: [], error: null }
        Object.assign(row, call.payload as Record<string, unknown>)
        return { data: [{ id: row.id }], error: null }
      }
      if (call.table === 'carpenters') return { data: { email: 'shop@example.com', email_verified_at: '2026-10-01' }, error: null }
      if (call.table === 'quote_requests' && call.op === 'insert') {
        const row = call.payload as Record<string, unknown>
        if (row.client_request_id && db.quotes.some((q) => q.carpenter_id === row.carpenter_id && q.client_request_id === row.client_request_id)) {
          return { data: null, error: { code: '23505' } }
        }
        const saved = { id: `q${db.quotes.length + 1}`, ...row }
        db.quotes.push(saved)
        return { data: { id: saved.id }, error: null }
      }
      return { data: null, error: null }
    })
    db.calls.push(calls)
    return client
  },
}))

const { POST } = await import('./route')

const PRODUCT = '11111111-1111-4111-8111-111111111111'
const SUPPLIER = '22222222-2222-4222-8222-222222222222'
const KEY = '33333333-3333-4333-8333-333333333333'

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/carpenter/quotes', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  db.priceMode = 'shown'
  db.thresholds = new Map()
  db.quotes = []
  db.calls = []
  db.offer = {
    id: 'o1',
    pack_label: 'מיכל',
    pack_qty: 10,
    min_order_qty: 10,
    products: { name_he: 'דבק', base_unit: 'kg', is_active: true },
    suppliers: { company_name: 'ספק', email: 'supplier@example.com', status: 'approved' },
  }
  sendEmail.mockClear()
})

describe('POST /api/carpenter/quotes', () => {
  it('refuses a special price when the supplier set no threshold, and saves nothing', async () => {
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 100, client_request_id: KEY })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('no_special_price')
    expect(db.quotes).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('refuses below the threshold, in packs', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 30, client_request_id: KEY })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('below_threshold')
    expect(body.error).toContain('4 × מיכל')
    expect(db.quotes).toHaveLength(0)
  })

  it('refuses when the pack changed under the threshold', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 5 })
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 100, client_request_id: KEY })
    expect((await response.json()).code).toBe('no_special_price')
  })

  it('saves a volume request from the threshold up and emails the supplier once', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40, client_request_id: KEY })
    expect(response.status).toBe(201)
    expect(db.quotes).toHaveLength(1)
    expect(db.quotes[0]).toMatchObject({ kind: 'volume', client_request_id: KEY, supplier_id: SUPPLIER, quantity: 40 })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('returns the same request on a repeated send, without a second email', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40, note: 'עד חמישי', client_request_id: KEY })
    const again = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40, note: 'עד חמישי', client_request_id: KEY })
    expect(again.status).toBe(200)
    expect(await again.json()).toMatchObject({ ok: true, id: 'q1', existing: true })
    expect(db.quotes).toHaveLength(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('answers 409 when the same id comes back with other details', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40, client_request_id: KEY })
    const changed = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 80, client_request_id: KEY })
    expect(changed.status).toBe(409)
    expect((await changed.json()).code).toBe('request_conflict')
    expect(db.quotes).toHaveLength(1)
  })

  it('saves separate requests for the same product in other quantities', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10 })
    await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40, client_request_id: KEY })
    const other = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 80, client_request_id: '44444444-4444-4444-8444-444444444444' })
    expect(other.status).toBe(201)
    expect(db.quotes).toHaveLength(2)
  })

  it('lets a quote-only supplier be asked from its minimum order, threshold or not', async () => {
    db.priceMode = 'quote'
    const below = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 5 })
    expect((await below.json()).code).toBe('below_min_order')
    const ok = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 10 })
    expect(ok.status).toBe(201)
    expect(db.quotes[0]).toMatchObject({ kind: 'quote' })
  })

  it('answers at once with the supplier\'s special price when the request reaches the threshold', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10, price: 18.5 })
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 50, client_request_id: KEY })
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.quoted).toMatchObject({ unitPrice: 18.5 })
    expect(db.quotes[0]).toMatchObject({ kind: 'volume', status: 'quoted', quoted_unit_price_excl_vat: 18.5 })
    // The supplier is told it was answered, and the carpentry gets the answer.
    expect(sendEmail).toHaveBeenCalledTimes(2)
    // A repeated send does not answer or mail again.
    await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 50, client_request_id: KEY })
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('answers a quote-only supplier\'s request at once only from the threshold up', async () => {
    db.priceMode = 'quote'
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10, price: 18.5 })
    const small = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 20 })
    expect((await small.json()).quoted).toBeNull()
    expect(db.quotes[0]).toMatchObject({ kind: 'quote' })
    expect(db.quotes[0].status).toBeUndefined()
    const large = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40 })
    expect((await large.json()).quoted).toMatchObject({ unitPrice: 18.5 })
    expect(db.quotes[1]).toMatchObject({ kind: 'volume', status: 'quoted' })
  })

  it('leaves the request to the supplier when the threshold has no price', async () => {
    db.thresholds.set('o1', { minQty: 40, setForPackQty: 10, price: null })
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40 })
    expect((await response.json()).quoted).toBeNull()
    expect(db.quotes[0].status).toBeUndefined()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('sends only to the supplier named, and refuses one that does not sell it', async () => {
    db.offer = null
    const response = await post({ product_id: PRODUCT, supplier_id: SUPPLIER, quantity: 40 })
    expect(response.status).toBe(404)
    expect(db.quotes).toHaveLength(0)
  })
})
