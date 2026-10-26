import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, type FakeCall } from '@/test/fake-supabase'

const state = vi.hoisted(() => ({
  current: null as null | { packQty: number | null; minOrderQty: number; threshold: { minQty: number | null; setForPackQty: number | null } | null },
  calls: [] as { table: string; op: string; payload: unknown }[],
  offer: {} as Record<string, unknown>,
  updateError: null as null | { code?: string; message?: string },
}))

vi.mock('@/lib/supplier-auth', () => ({ getSessionSupplier: async () => ({ id: 'S1', source: 'self' }) }))
vi.mock('@/lib/admin-scope', () => ({ refuseAdminWriteFor: async () => null }))
vi.mock('@/lib/special-price', () => ({ loadOfferForThreshold: async () => state.current }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call: FakeCall) => {
      state.calls.push({ table: call.table, op: call.op, payload: call.payload })
      if (call.table === 'supplier_offers' && call.op === 'select') {
        return { data: { id: 'o1', product_id: 'p1', is_active: true, products: { created_by_supplier_id: 'S1' }, ...state.offer }, error: null }
      }
      if (call.table === 'supplier_offers' && call.op === 'update' && state.updateError) {
        const error = state.updateError
        state.updateError = null
        return { data: null, error }
      }
      if (call.table === 'products' && call.op === 'select') return { data: { id: 'p1' }, error: null }
      if (call.op === 'insert') return { data: { id: 'new' }, error: null }
      return { data: null, error: null }
    }).client,
}))

const { DELETE, PATCH, POST } = await import('./route')

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
  state.offer = {}
  state.updateError = null
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

function remove(query: string) {
  return DELETE(new NextRequest(`http://localhost/api/supplier/products?${query}`, { method: 'DELETE' }))
}

describe('DELETE /api/supplier/products: deleted products can come back', () => {
  it('marks the offer and switches it off instead of removing it', async () => {
    const response = await remove('offer_id=o1')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ deleted: true })
    expect(offerWrites()).toHaveLength(1)
    expect(offerWrites()[0]).toMatchObject({ op: 'update', payload: { is_active: false, active_before_delete: true } })
    expect((offerWrites()[0].payload as Record<string, unknown>).deleted_at).toEqual(expect.any(String))
    expect(state.calls.some((c) => c.op === 'delete')).toBe(false)
  })

  it('hides the offer on a database without the deleted_at column', async () => {
    state.updateError = { code: '42703', message: 'column "deleted_at" does not exist' }
    const response = await remove('offer_id=o1')
    expect(await response.json()).toMatchObject({ hidden: true })
    expect(offerWrites()[1].payload).toMatchObject({ is_active: false })
    expect(state.calls.some((c) => c.op === 'delete')).toBe(false)
  })

  it('refuses to delete for good an offer that is not in "נמחקו"', async () => {
    const response = await remove('offer_id=o1&permanent=1')
    expect(response.status).toBe(409)
    expect(state.calls.some((c) => c.op === 'delete')).toBe(false)
  })

  it('deletes for good from "נמחקו"', async () => {
    state.offer = { deleted_at: '2026-10-26T10:00:00Z' }
    const response = await remove('offer_id=o1&permanent=1')
    expect(response.status).toBe(200)
    expect(state.calls.some((c) => c.table === 'supplier_offers' && c.op === 'delete')).toBe(true)
  })
})

describe('PATCH /api/supplier/products: restore', () => {
  it('brings a deleted offer back as it was', async () => {
    state.offer = { deleted_at: '2026-10-26T10:00:00Z', active_before_delete: false }
    const response = await send('PATCH', { offer_id: 'o1', restore: true })
    expect(await response.json()).toMatchObject({ restored: true, is_active: false })
    expect(offerWrites()[0].payload).toMatchObject({ deleted_at: null, active_before_delete: null, is_active: false })
  })

  it('does nothing to an offer that is not deleted', async () => {
    const response = await send('PATCH', { offer_id: 'o1', restore: true })
    expect(await response.json()).toMatchObject({ restored: false })
    expect(offerWrites()).toHaveLength(0)
  })
})
