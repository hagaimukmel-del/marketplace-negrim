import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  db: false,
  viewer: { carpenter: { id: 'c1' } as { id: string } | null, admin: false, profile: null, member: false, open: true },
}))

vi.mock('@/lib/work-server', () => ({ getWorkViewer: async () => state.viewer }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    state.db = true
    throw new Error('the database is not reached in these tests')
  },
}))

const { POST } = await import('./route')

function report(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/work/report', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  state.db = false
  state.viewer = { carpenter: { id: 'c1' }, admin: false, profile: null, member: false, open: true }
})

describe('POST /api/work/report', () => {
  it('refuses while the board is closed', async () => {
    state.viewer = { ...state.viewer, open: false }
    expect((await report({ job_id: 'j1', reason: 'not_real' })).status).toBe(403)
  })

  it('needs a reason from the list', async () => {
    expect((await report({ job_id: 'j1', reason: 'boring' })).status).toBe(400)
    expect(state.db).toBe(false)
  })

  it('lets a carpentry without a subscription report', async () => {
    const response = await report({ job_id: 'j1', reason: 'not_real' })
    // The fake database throws; reaching it is what this checks.
    expect(state.db).toBe(true)
    expect(response.status).toBe(500)
  })
})
