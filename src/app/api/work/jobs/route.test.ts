import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  db: false,
  viewer: { carpenter: null as { id: string } | null, admin: false, profile: null, member: false, open: false },
}))

vi.mock('@/lib/work-server', () => ({ getWorkViewer: async () => state.viewer }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    state.db = true
    throw new Error('the database is not reached in these tests')
  },
}))

const { POST, PATCH } = await import('./route')

function post(fields: Record<string, string>) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.set(key, value))
  return POST(new NextRequest('http://localhost/api/work/jobs', { method: 'POST', body: form }))
}

const GOOD = { job_type: 'cnc', region: 'south', quantity: '40 לוחות', due_date: '2099-01-01', description: 'חיתוך לפי קובץ' }

beforeEach(() => {
  state.db = false
  state.viewer = { carpenter: { id: 'c1' }, admin: false, profile: null, member: true, open: true }
})

describe('POST /api/work/jobs', () => {
  it('refuses a visitor who is not signed in', async () => {
    state.viewer = { ...state.viewer, carpenter: null }
    expect((await post(GOOD)).status).toBe(401)
    expect(state.db).toBe(false)
  })

  it('refuses while the board is closed', async () => {
    state.viewer = { ...state.viewer, open: false }
    expect((await post(GOOD)).status).toBe(403)
    expect(state.db).toBe(false)
  })

  it('refuses a carpentry without a subscription', async () => {
    state.viewer = { ...state.viewer, member: false }
    expect((await post(GOOD)).status).toBe(403)
    expect(state.db).toBe(false)
  })

  it('refuses a bad job before touching the database', async () => {
    const response = await post({ ...GOOD, job_type: 'hiring' })
    expect(response.status).toBe(400)
    expect(state.db).toBe(false)
  })
})

describe('PATCH /api/work/jobs', () => {
  function patch(body: Record<string, unknown>) {
    return PATCH(new NextRequest('http://localhost/api/work/jobs', { method: 'PATCH', body: JSON.stringify(body) }))
  }

  it('needs an outcome to close a job', async () => {
    expect((await patch({ id: 'j1', action: 'close', outcome: 'whatever' })).status).toBe(400)
    expect(state.db).toBe(false)
  })

  it('refuses an unknown action', async () => {
    expect((await patch({ id: 'j1', action: 'extend' })).status).toBe(400)
  })
})
