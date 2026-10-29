import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  carpenter: null as { id: string } | null,
  subscription: null as { status: string } | null,
  calls: [] as string[],
}))

vi.mock('@/lib/carpenter-auth', () => ({ getSessionCarpenter: async () => state.carpenter }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        update: () => {
          state.calls.push(`update ${table}`)
          return chain
        },
        delete: () => {
          state.calls.push(`delete ${table}`)
          return chain
        },
        eq: () => chain,
        in: () => chain,
        maybeSingle: async () => ({ data: state.subscription, error: null }),
        then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
      }
      return chain
    },
  }),
}))

const { DELETE } = await import('./route')

beforeEach(() => {
  state.carpenter = { id: 'c1' }
  state.subscription = { status: 'founding' }
  state.calls = []
})

describe('DELETE /api/work/profile', () => {
  it('refuses a visitor who is not signed in', async () => {
    state.carpenter = null
    expect((await DELETE()).status).toBe(401)
    expect(state.calls).toEqual([])
  })

  it('does not end a paid term', async () => {
    state.subscription = { status: 'active' }
    expect((await DELETE()).status).toBe(409)
    expect(state.calls).toEqual([])
  })

  it('takes the jobs down and stops the emails before leaving, deleting only the membership row', async () => {
    expect((await DELETE()).status).toBe(200)
    expect(state.calls).toEqual(['update work_jobs', 'update work_profiles', 'delete work_subscriptions'])
  })
})
