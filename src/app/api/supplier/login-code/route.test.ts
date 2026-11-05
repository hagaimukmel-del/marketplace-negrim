import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, type FakeCall } from '@/test/fake-supabase'

const state = vi.hoisted(() => ({
  supplier: { id: 's1' } as { id: string } | null,
  validCode: '123456',
  consumed: [] as [string, string, string][],
  calls: [] as FakeCall[],
}))

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    const fake = fakeSupabase((call) => {
      state.calls.push(call)
      return { data: call.table === 'suppliers' ? state.supplier : null, error: null }
    })
    return fake.client
  },
}))
vi.mock('@/lib/login-code', () => ({
  consumeLoginCode: async (id: string, code: string, kind: string) => {
    state.consumed.push([id, code, kind])
    return code === state.validCode
  },
}))
vi.mock('@/lib/supplier-auth', () => ({
  buildSupplierCookie: (id: string, via: string) => ({ name: 'supplier_session', value: `${id}:${via}`, path: '/' }),
}))

const { POST } = await import('./route')

let ip = 0
const post = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/supplier/login-code', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'x-forwarded-for': `10.0.0.${++ip}` },
    })
  )

describe('POST /api/supplier/login-code', () => {
  beforeEach(() => {
    state.supplier = { id: 's1' }
    state.consumed = []
    state.calls = []
  })

  it('signs the browser in as the supplier with the right code', async () => {
    const res = await post({ email: 'Supplier@Example.com ', code: '123456' })
    expect(res.status).toBe(200)
    expect(res.cookies.get('supplier_session')?.value).toBe('s1:own')
    expect(state.consumed).toEqual([['s1', '123456', 'supplier']])
    const lookup = state.calls.find((call) => call.table === 'suppliers')
    expect(lookup?.filters).toContainEqual(['eq', 'status', 'approved'])
  })

  it('refuses a wrong code without a cookie', async () => {
    const res = await post({ email: 'supplier@example.com', code: '000000' })
    expect(res.status).toBe(400)
    expect(res.cookies.get('supplier_session')).toBeUndefined()
  })

  it('answers an unknown address exactly like a wrong code', async () => {
    const wrong = await (await post({ email: 'supplier@example.com', code: '000000' })).json()
    state.supplier = null
    const unknown = await post({ email: 'nobody@example.com', code: '123456' })
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual(wrong)
    expect(state.consumed).toHaveLength(1)
  })
})
