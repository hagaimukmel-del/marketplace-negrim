import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, type FakeCall } from '@/test/fake-supabase'

const state = vi.hoisted(() => ({
  current: null as null | { packQty: number | null; minOrderQty: number; threshold: { minQty: number | null; setForPackQty: number | null } | null },
  calls: [] as { table: string; op: string; payload: unknown }[],
}))

vi.mock('@/lib/supplier-auth', () => ({ getSessionSupplier: async () => ({ id: 'S1', source: 'self' }) }))
vi.mock('@/lib/admin-scope', () => ({ refuseAdminWriteFor: async () => null }))
vi.mock('@/lib/special-price', () => ({ loadOfferForThreshold: async () => state.current }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call: FakeCall) => {
      state.calls.push({ table: call.table, op: call.op, payload: call.payload })
      if (call.table === 'supplier_offers' && call.op === 'select') {
        return { data: { id: 'o1', product_id: 'p1', products: { created_by_supplier_id: 'S1' } }, error: null }
      }
      if (call.table === 'products' && call.op === 'select') return { data: { id: 'p1' }, error: null }
      if (call.op === 'insert') return { data: { id: 'new' }, error: null }
      return { data: null, error: null }
    }).client,
}))

const { PATCH, POST } = await import('./route')

function send(method: 'PATCH' | 'POST', body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost/api/supplier/products', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return method === 'PATCH' ? PATCH(request) : POST(request)
}

const offerWrites = () => state.calls.filter((c) => c.table === 'supplier_offers' && c.op !== 'select')

beforeEach(() => {
  state.current = { packQty: 10, minOrderQty: 10, threshold: { minQty: 40, setForPackQty: 10 } }
  state.calls = []
})

describe('PATCH /api/supplier/products: the special-price threshold', () => {
  it('refuses a pack change under a threshold the supplier did not confirm, and writes nothing', async () => {
    const response = await send('PATCH', { offer_id: 'o1', pack_qty: '25' })
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('threshold_review')
    expect(offerWrites()).toHaveLength(0)
  })

  it('saves a confirmed threshold with the new pack size', async () => {
    const response = await send('PATCH', { offer_id: 'o1', pack_qty: '25', special_price_min_qty: '100' })
    expect(response.status).toBe(200)
    expect(offerWrites()[0].payload).toMatchObject({ pack_qty: 25, special_price_min_qty: 100, special_price_pack_qty: 25 })
  })

  it('refuses a threshold that is not whole packs', async () => {
    const response = await send('PATCH', { offer_id: 'o1', special_price_min_qty: '45' })
    expect(response.status).toBe(400)
    expect(offerWrites()).toHaveLength(0)
  })

  it('refuses a minimum order raised above the threshold', async () => {
    const response = await send('PATCH', { offer_id: 'o1', min_order_qty: '50' })
    expect(response.status).toBe(400)
    expect(offerWrites()).toHaveLength(0)
  })

  it('leaves the threshold alone on a price-only edit', async () => {
    const response = await send('PATCH', { offer_id: 'o1', price_excl_vat: '55' })
    expect(response.status).toBe(200)
    const payload = offerWrites()[0].payload as Record<string, unknown>
    expect(payload.price_excl_vat).toBe(55)
    expect('special_price_min_qty' in payload).toBe(false)
  })
})

describe('POST /api/supplier/products: a new offer', () => {
  it('checks the threshold against the pack and minimum sent with it', async () => {
    const bad = await send('POST', { product_id: 'p1', price_excl_vat: '50', pack_qty: '10', min_order_qty: '10', special_price_min_qty: '45' })
    expect(bad.status).toBe(400)
    const ok = await send('POST', { product_id: 'p1', price_excl_vat: '50', pack_qty: '10', min_order_qty: '10', special_price_min_qty: '40' })
    expect(ok.status).toBe(201)
    expect(state.calls.find((c) => c.op === 'insert')?.payload).toMatchObject({ special_price_min_qty: 40, special_price_pack_qty: 10 })
  })

  it('adds no threshold columns when none is given', async () => {
    await send('POST', { product_id: 'p1', price_excl_vat: '50', special_price_min_qty: '' })
    const payload = state.calls.find((c) => c.op === 'insert')?.payload as Record<string, unknown>
    expect('special_price_min_qty' in payload).toBe(false)
  })
})
