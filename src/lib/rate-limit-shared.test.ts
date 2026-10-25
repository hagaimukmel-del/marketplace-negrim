import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state: { count: number | null; error: unknown; threads: { id: string }[] } = { count: 0, error: null, threads: [] }
const calls: { table: string; filters: [string, unknown][] }[] = []

function query(table: string) {
  const call = { table, filters: [] as [string, unknown][] }
  calls.push(call)
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    in: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    gte: () => chain,
    limit: () => Promise.resolve({ data: state.threads, error: state.error }),
    then: (resolve: (value: { count: number | null; error: unknown }) => void) => resolve({ count: state.count, error: state.error }),
  }
  return chain
}

vi.mock('./supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: query }) }))

const { sharedLimitReached } = await import('./rate-limit-shared')

beforeEach(() => {
  state.count = 0
  state.error = null
  state.threads = []
  calls.length = 0
})

describe('sharedLimitReached', () => {
  it('counts the carpentry’s own quote requests against the limit (20 an hour)', async () => {
    state.count = 19
    expect(await sharedLimitReached('quoteRequest', { side: 'carpenter', id: 'c1' })).toBe(false)
    state.count = 20
    expect(await sharedLimitReached('quoteRequest', { side: 'carpenter', id: 'c1' })).toBe(true)
    expect(calls[0]).toMatchObject({ table: 'quote_requests', filters: [['carpenter_id', 'c1']] })
  })

  it('counts a supplier’s messages in its own threads', async () => {
    state.threads = [{ id: 't1' }, { id: 't2' }]
    state.count = 60
    expect(await sharedLimitReached('message', { side: 'supplier', id: 's1' })).toBe(true)
    expect(calls[0].filters).toEqual([['supplier_id', 's1']])
    expect(calls[1]).toMatchObject({ table: 'messages', filters: [['thread_id', ['t1', 't2']], ['sender', 'supplier']] })
  })

  it('lets the request through when the count fails or there are no threads', async () => {
    expect(await sharedLimitReached('message', { side: 'carpenter', id: 'c1' })).toBe(false)
    state.error = { message: 'down' }
    state.count = 999
    expect(await sharedLimitReached('supplierQuestion', { side: 'carpenter', id: 'c1' })).toBe(false)
  })
})
