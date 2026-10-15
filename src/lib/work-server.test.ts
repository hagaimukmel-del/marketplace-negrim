import { describe, expect, it, vi } from 'vitest'

const ROWS = [
  {
    id: 'j1',
    carpenter_id: 'c-poster',
    job_type: 'cnc',
    region: 'south',
    quantity: '40 לוחות',
    material: null,
    due_date: '2099-01-01',
    description: 'חיתוך לפי קובץ',
    image_url: null,
    status: 'open',
    expires_at: '2099-01-01T20:59:00Z',
    created_at: '2026-10-15T06:00:00Z',
    carpenters: { business_name: 'נגריית הדרום', city: 'באר שבע', is_active: true },
  },
]

/** A query builder that accepts any chain and resolves to the rows. */
function fakeQuery(): unknown {
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'gt', 'order', 'limit']) query[name] = () => query
  query.then = (resolve: (value: unknown) => void) => resolve({ data: ROWS, error: null })
  return query
}

vi.mock('@/lib/carpenter-auth', () => ({ getSessionCarpenter: async () => null }))
vi.mock('@/lib/admin-auth', () => ({ isAdmin: async () => false }))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: () => fakeQuery() }) }))

const { loadBoard } = await import('./work-server')

describe('loadBoard', () => {
  it('sends no poster name to a carpentry without a subscription', async () => {
    const viewer = { carpenter: { id: 'c-viewer' } as never, admin: false, profile: null, member: false, open: true }
    const jobs = await loadBoard(viewer, {})
    expect(jobs).toHaveLength(1)
    expect(JSON.stringify(jobs)).not.toContain('נגריית הדרום')
    expect(JSON.stringify(jobs)).not.toContain('c-poster')
  })

  it('sends it to a member', async () => {
    const viewer = { carpenter: { id: 'c-viewer' } as never, admin: false, profile: null, member: true, open: true }
    const [job] = await loadBoard(viewer, {})
    expect(job.poster?.businessName).toBe('נגריית הדרום')
  })
})
