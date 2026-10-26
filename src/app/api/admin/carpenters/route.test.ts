import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  admin: true,
  calls: [] as string[],
  deleted: new Set<string>(),
  hardDeleteFilters: [] as string[],
}))

vi.mock('@/lib/admin-auth', () => ({ isAdmin: async () => state.admin }))
vi.mock('@/lib/admin-scope', () => ({ logAdminAction: async () => {} }))
vi.mock('@/lib/carpenter-deletion-server', () => ({
  deletedCarpenterIds: async () => state.deleted,
  softDeleteCarpenter: async (id: string) => {
    state.calls.push(`soft:${id}`)
    return { ok: true }
  },
  restoreCarpenter: async (id: string) => {
    state.calls.push(`restore:${id}`)
    return { ok: true }
  },
}))

/** Records which filters the permanent delete puts on the row. */
function deleteQuery(): unknown {
  const query: Record<string, unknown> = {}
  query.delete = () => query
  query.eq = (column: string) => {
    state.hardDeleteFilters.push(`eq:${column}`)
    return query
  }
  query.not = (column: string, op: string) => {
    state.hardDeleteFilters.push(`not:${column}:${op}`)
    return query
  }
  query.update = () => query
  query.select = () => query
  query.maybeSingle = async () => ({ data: { id: 'c1', business_name: 'נגריית ניסיון' }, error: null })
  return query
}

vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: () => deleteQuery() }) }))

const { DELETE, PATCH } = await import('./route')

const del = (query: string) => DELETE(new NextRequest(`http://localhost/api/admin/carpenters?${query}`, { method: 'DELETE' }))
const patch = (body: Record<string, unknown>) =>
  PATCH(new NextRequest('http://localhost/api/admin/carpenters', { method: 'PATCH', body: JSON.stringify(body) }))

beforeEach(() => {
  state.admin = true
  state.calls = []
  state.deleted = new Set()
  state.hardDeleteFilters = []
})

describe('DELETE /api/admin/carpenters', () => {
  it('only marks the carpentry deleted', async () => {
    expect((await del('id=c1')).status).toBe(200)
    expect(state.calls).toEqual(['soft:c1'])
    expect(state.hardDeleteFilters).toEqual([])
  })

  it('removes for good only a row that is already deleted', async () => {
    expect((await del('id=c1&permanent=1')).status).toBe(200)
    expect(state.calls).toEqual([])
    expect(state.hardDeleteFilters).toContain('not:deleted_at:is')
  })

  it('refuses without the admin cookie', async () => {
    state.admin = false
    expect((await del('id=c1')).status).toBe(401)
    expect(state.calls).toEqual([])
  })
})

describe('PATCH /api/admin/carpenters', () => {
  it('restores in one call', async () => {
    expect((await patch({ id: 'c1', restore: true })).status).toBe(200)
    expect(state.calls).toEqual(['restore:c1'])
  })

  it('will not unblock a deleted carpentry behind the restore', async () => {
    state.deleted = new Set(['c1'])
    expect((await patch({ id: 'c1', is_active: true })).status).toBe(409)
  })
})
