import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  db: false,
  viewer: { carpenter: { id: 'c1' } as { id: string } | null, admin: false, profile: null, member: true, open: true },
}))

vi.mock('@/lib/work-server', () => ({ getWorkViewer: async () => state.viewer }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    state.db = true
    throw new Error('the database is not reached in these tests')
  },
}))

const { POST } = await import('./route')

const JOB = '11111111-1111-4111-8111-111111111111'

function answer(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/work/conversations', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  state.db = false
  state.viewer = { carpenter: { id: 'c1' }, admin: false, profile: null, member: true, open: true }
})

describe('POST /api/work/conversations', () => {
  it('needs a signed-in carpentry', async () => {
    state.viewer = { ...state.viewer, carpenter: null }
    expect((await answer({ job_id: JOB, body: 'שלום' })).status).toBe(401)
  })

  it('refuses while the board is closed', async () => {
    state.viewer = { ...state.viewer, open: false }
    expect((await answer({ job_id: JOB, body: 'שלום' })).status).toBe(403)
    expect(state.db).toBe(false)
  })

  it('refuses a carpentry without a subscription', async () => {
    state.viewer = { ...state.viewer, member: false }
    expect((await answer({ job_id: JOB, body: 'שלום' })).status).toBe(403)
    expect(state.db).toBe(false)
  })

  it('needs a first message and a job id', async () => {
    expect((await answer({ job_id: JOB, body: '   ' })).status).toBe(400)
    expect((await answer({ job_id: 'nope', body: 'שלום' })).status).toBe(400)
    expect(state.db).toBe(false)
  })

  it('goes to the database for a member with a message', async () => {
    await answer({ job_id: JOB, body: 'יש לנו CNC פנוי השבוע' }).catch(() => null)
    expect(state.db).toBe(true)
  })
})
