import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, filterValue, type FakeCall } from '@/test/fake-supabase'

// What the database holds for each test: one priced product, and the orders written so far.
const db = vi.hoisted(() => ({
  orders: [] as Record<string, unknown>[],
  items: [] as Record<string, unknown>[],
  /** Another attempt of the same send lands between the first look and the insert. */
  raceOnce: false,
}))
const notifyNewOrders = vi.hoisted(() => vi.fn(async () => undefined))

const CARPENTER = { id: 'c1', email: 'shop@example.com', email_verified_at: '2026-10-01', contact_name: 'דנה', business_name: 'נגריית בדיקה', phone: '0501234567' }
const PRODUCT = '11111111-1111-4111-8111-111111111111'
const SUPPLIER = '22222222-2222-4222-8222-222222222222'
const KEY = '33333333-3333-4333-8333-333333333333'

vi.mock('@/lib/carpenter-auth', () => ({ getSessionCarpenter: async () => ({ token: 'session-token-123' }) }))
vi.mock('@/lib/offer', () => ({ resolveCarpenter: async () => CARPENTER, logEvent: async () => undefined }))
vi.mock('@/lib/notify-order', () => ({ notifyNewOrders }))
vi.mock('@/lib/price-mode', () => ({ loadPriceModes: async () => ({ ready: true, quoteOnly: new Set() }) }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call: FakeCall) => {
      if (call.table === 'products') {
        const offer = { id: 'o1', supplier_id: SUPPLIER, supplier_sku: null, price_excl_vat: 50, stock_qty: 100, pack_label: null, pack_qty: null, min_order_qty: 1, lead_time_days: null }
        return { data: [{ id: PRODUCT, name_he: 'דבק', name_en: null, supplier_offers: [offer] }], error: null }
      }
      if (call.table === 'suppliers') return { data: [{ id: SUPPLIER, company_name: 'ספק בדיקה', min_order_value_excl_vat: null, payment_terms: [] }], error: null }
      if (call.table === 'orders' && call.op === 'select') {
        const found = db.orders.filter(
          (row) => row.carpenter_id === filterValue(call, 'eq', 'carpenter_id') && row.checkout_id === filterValue(call, 'eq', 'checkout_id')
        )
        return { data: found.map((row) => ({ ...row, suppliers: { company_name: 'ספק בדיקה' } })), error: null }
      }
      if (call.table === 'orders' && call.op === 'insert') {
        const rows = call.payload as Record<string, unknown>[]
        if (db.raceOnce) {
          db.raceOnce = false
          db.orders.push({ ...rows[0], id: 'raced', short_number: 7 })
        }
        // orders_checkout_supplier_key
        if (rows.some((row) => db.orders.some((o) => o.checkout_id === row.checkout_id && o.supplier_id === row.supplier_id))) {
          return { data: null, error: { code: '23505' } }
        }
        const saved = rows.map((row, i) => ({ ...row, id: `order${db.orders.length + i + 1}`, short_number: 100 + db.orders.length + i }))
        db.orders.push(...saved)
        return { data: saved, error: null }
      }
      if (call.table === 'orders' && call.op === 'delete') {
        const ids = filterValue(call, 'in', 'id') as string[] | undefined
        db.orders = db.orders.filter((row) => !ids?.includes(row.id as string))
        return { data: null, error: null }
      }
      if (call.table === 'order_items' && call.op === 'insert') {
        db.items.push(...(call.payload as Record<string, unknown>[]))
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }).client,
}))

const { POST } = await import('./route')

function send(body: Record<string, unknown> = {}) {
  return POST(
    new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [{ id: PRODUCT, name_he: 'דבק', base_price_excl_vat: 50, quantity: 2, supplier_id: SUPPLIER }], ...body }),
    })
  )
}

beforeEach(() => {
  db.orders = []
  db.items = []
  db.raceOnce = false
  notifyNewOrders.mockClear()
})

describe('POST /api/orders, sent once', () => {
  it('sends a checkout and stamps it with the cart’s id', async () => {
    const response = await send({ checkout_id: KEY })
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result.orders).toHaveLength(1)
    expect(db.orders[0].checkout_id).toBe(KEY)
    expect(notifyNewOrders).toHaveBeenCalledTimes(1)
  })

  it('returns the orders already sent when the same send repeats, and writes and emails nothing', async () => {
    const first = await (await send({ checkout_id: KEY })).json()
    const again = await send({ checkout_id: KEY })
    expect(again.status).toBe(200)
    const result = await again.json()
    expect(result.replayed).toBe(true)
    expect(result.orders.map((o: { id: string }) => o.id)).toEqual(first.orders.map((o: { id: string }) => o.id))
    expect(db.orders).toHaveLength(1)
    expect(db.items).toHaveLength(1)
    expect(notifyNewOrders).toHaveBeenCalledTimes(1)
  })

  it('reads the winner when two attempts race past the first look', async () => {
    db.raceOnce = true
    const response = await send({ checkout_id: KEY })
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.orders.map((o: { id: string }) => o.id)).toEqual(['raced'])
    expect(db.orders).toHaveLength(1)
    expect(notifyNewOrders).not.toHaveBeenCalled()
  })

  it('treats separate sends as separate orders', async () => {
    await send({ checkout_id: KEY })
    await send({ checkout_id: '44444444-4444-4444-8444-444444444444' })
    await send()
    expect(db.orders).toHaveLength(3)
  })
})
