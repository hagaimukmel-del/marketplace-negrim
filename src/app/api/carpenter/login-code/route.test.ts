import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  carpenter: null as { id: string; email: string | null; email_verified_at: string | null } | null,
  supplier: { id: 's1' } as { id: string } | null,
  validCode: '123456',
  consumed: [] as [string, string, string | undefined][],
}))

vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({}) }))
vi.mock('@/lib/login-code', () => ({
  findCarpenterByIdentifier: async () => state.carpenter,
  consumeLoginCode: async (id: string, code: string, kind?: string) => {
    state.consumed.push([id, code, kind])
    return code === state.validCode
  },
}))
vi.mock('@/lib/supplier-login', () => ({
  findApprovedSupplierByEmail: async () => state.supplier,
}))
vi.mock('@/lib/carpenter-auth', () => ({
  buildCarpenterCookie: (id: string) => ({ name: 'carpenter_session', value: id, path: '/' }),
}))
vi.mock('@/lib/supplier-auth', () => ({
  buildSupplierCookie: (id: string, via: string) => ({ name: 'supplier_session', value: `${id}:${via}`, path: '/' }),
}))

const { POST } = await import('./route')

let ip = 0
const post = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/carpenter/login-code', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'x-forwarded-for': `10.1.0.${++ip}` },
    })
  )

describe('POST /api/carpenter/login-code, a supplier on the carpentry login', () => {
  beforeEach(() => {
    state.carpenter = null
    state.supplier = { id: 's1' }
    state.consumed = []
  })

  it('signs a supplier in with their supplier code and sends them to /supplier', async () => {
    const res = await post({ identifier: 'supplier@example.com', code: '123456' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, redirect: '/supplier' })
    expect(res.cookies.get('supplier_session')?.value).toBe('s1:own')
    expect(state.consumed).toEqual([['s1', '123456', 'supplier']])
  })

  it('refuses a wrong supplier code without a cookie', async () => {
    const res = await post({ identifier: 'supplier@example.com', code: '000000' })
    expect(res.status).toBe(400)
    expect(res.cookies.get('supplier_session')).toBeUndefined()
  })

  it('prefers the carpentry when one holds the email', async () => {
    state.carpenter = { id: 'c1', email: 'x@example.com', email_verified_at: '2026-01-01' }
    const res = await post({ identifier: 'x@example.com', code: '123456' })
    expect(res.status).toBe(200)
    expect(res.cookies.get('carpenter_session')?.value).toBe('c1')
    expect(res.cookies.get('supplier_session')).toBeUndefined()
    expect(state.consumed).toEqual([['c1', '123456', undefined]])
  })

  it('does not look for a supplier by phone number', async () => {
    const res = await post({ identifier: '0501234567', code: '123456' })
    expect(res.status).toBe(400)
    expect(state.consumed).toEqual([])
  })
})
