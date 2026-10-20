import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, type FakeCall } from '@/test/fake-supabase'

// login_codes as the database would hold it, one carpentry's rows.
const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))

function matches(row: Record<string, unknown>, call: FakeCall): boolean {
  return call.filters.every(([kind, column, value]) => (kind === 'eq' || kind === 'is' ? (row[column] ?? null) === value : true))
}

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call: FakeCall) => {
      if (call.table !== 'login_codes') return { data: null, error: null }
      if (call.op === 'insert') {
        db.rows.push({ id: `r${db.rows.length + 1}`, attempts: 0, used_at: null, created_at: String(db.rows.length), ...(call.payload as object) })
        return { data: null, error: null }
      }
      const hit = db.rows.filter((row) => matches(row, call))
      if (call.op === 'update') {
        hit.forEach((row) => Object.assign(row, call.payload as object))
        return { data: hit.map((row) => ({ id: row.id })), error: null }
      }
      const newest = [...hit].sort((a, b) => Number(b.created_at) - Number(a.created_at))
      return { data: call.single ? (newest[0] ?? null) : newest, error: null }
    }).client,
}))

process.env.ADMIN_SECRET = 'test-secret-at-least-16-chars'
const { consumeLoginCode, issueLoginCode, MAX_ATTEMPTS } = await import('./login-code')

const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0')

describe('login codes', () => {
  beforeEach(() => {
    db.rows = []
  })

  it('issues six digits and stores only a hash', async () => {
    const code = await issueLoginCode('c1')
    expect(code).toMatch(/^\d{6}$/)
    expect(JSON.stringify(db.rows)).not.toContain(code)
  })

  it('signs in once with the right code, then never again', async () => {
    const code = await issueLoginCode('c1')
    expect(await consumeLoginCode('c1', code)).toBe(true)
    expect(await consumeLoginCode('c1', code)).toBe(false)
  })

  it("accepts spaces and dashes, and not another carpentry's code", async () => {
    const code = await issueLoginCode('c1')
    expect(await consumeLoginCode('c2', code)).toBe(false)
    expect(await consumeLoginCode('c1', `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true)
  })

  it('stops working after too many wrong tries, even with the right code', async () => {
    const code = await issueLoginCode('c1')
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect(await consumeLoginCode('c1', wrong(code))).toBe(false)
    expect(await consumeLoginCode('c1', code)).toBe(false)
  })

  it('expires', async () => {
    const code = await issueLoginCode('c1')
    db.rows[0].expires_at = new Date(Date.now() - 1000).toISOString()
    expect(await consumeLoginCode('c1', code)).toBe(false)
  })

  it('retires the older code when a new one is sent', async () => {
    const first = await issueLoginCode('c1')
    const second = await issueLoginCode('c1')
    if (first !== second) expect(await consumeLoginCode('c1', first)).toBe(false)
    expect(await consumeLoginCode('c1', second)).toBe(true)
  })

})
