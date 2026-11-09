import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { currentWeek } from '@/lib/promo-weeks'

const state = vi.hoisted(() => ({
  admin: true,
  offer: true as boolean,
  insertError: null as null | { code: string },
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  holder: null as null | { id: string; supplier_id: string; status: string; note: string | null },
}))

vi.mock('@/lib/admin-auth', () => ({ isAdmin: async () => state.admin }))
vi.mock('@/lib/admin-scope', () => ({ logAdminAction: async () => {} }))

function query(table: string): unknown {
  let mode: 'select' | 'update' | 'insert' = 'select'
  const q: Record<string, unknown> = {}
  q.select = () => q
  q.eq = () => q
  q.in = () => q
  q.limit = () => q
  q.update = (row: Record<string, unknown>) => {
    mode = 'update'
    state.updates.push(row)
    return q
  }
  q.insert = (row: Record<string, unknown>) => {
    mode = 'insert'
    state.inserts.push(row)
    return q
  }
  q.single = async () => (state.insertError ? { data: null, error: state.insertError } : { data: { id: 'new' }, error: null })
  q.maybeSingle = async () => {
    if (table === 'supplier_offers') return { data: state.offer ? { id: 'o1' } : null, error: null }
    return { data: mode === 'select' ? state.holder : null, error: null }
  }
  q.then = (resolve: (value: unknown) => void) => resolve({ data: null, error: null })
  return q
}

vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: (table: string) => query(table) }) }))

const { PUT } = await import('./route')
const put = (body: Record<string, unknown>) =>
  PUT(new NextRequest('http://localhost/api/admin/promo', { method: 'PUT', body: JSON.stringify(body) }))
const base = { supplier_id: 's1', product_id: 'p1', week_start: currentWeek() }

beforeEach(() => {
  state.admin = true
  state.offer = true
  state.insertError = null
  state.updates = []
  state.inserts = []
  state.holder = null
})

describe('PUT /api/admin/promo', () => {
  it('refuses anyone but the admin', async () => {
    state.admin = false
    expect((await put(base)).status).toBe(401)
  })

  it('saves the week as approved at once', async () => {
    expect((await put(base)).status).toBe(201)
    expect(state.inserts[0]).toMatchObject({ status: 'approved', supplier_id: 's1', product_id: 'p1' })
  })

  it('refuses a product the supplier does not sell live', async () => {
    state.offer = false
    expect((await put(base)).status).toBe(400)
    expect(state.inserts).toHaveLength(0)
  })

  it('answers 409 when the week is taken and nothing was asked to be replaced', async () => {
    state.insertError = { code: '23505' }
    const response = await put(base)
    expect(response.status).toBe(409)
    expect((await response.json()).taken).toBe(true)
    expect(state.updates).toHaveLength(0)
  })

  it('puts the cancelled booking back when the replacement fails', async () => {
    state.holder = { id: 'old', supplier_id: 's2', status: 'requested', note: null }
    state.insertError = { code: '23505' }
    expect((await put({ ...base, replace: true })).status).toBe(409)
    expect(state.updates[0]).toMatchObject({ status: 'cancelled' })
    expect(state.updates[1]).toEqual({ status: 'requested', note: null })
  })
})
