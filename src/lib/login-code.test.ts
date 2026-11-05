import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, type FakeCall } from '@/test/fake-supabase'

// login_codes and supplier_login_codes as the database would hold them.
const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], supplierRows: [] as Record<string, unknown>[] }))

function matches(row: Record<string, unknown>, call: FakeCall): boolean {
  return call.filters.every(([kind, column, value]) => (kind === 'eq' || kind === 'is' ? (row[column] ?? null) === value : true))
}

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () =>
    fakeSupabase((call: FakeCall) => {
      const rows = call.table === 'login_codes' ? db.rows : call.table === 'supplier_login_codes' ? db.supplierRows : null
      if (!rows) return { data: null, error: null }
      if (call.op === 'insert') {
        rows.push({ id: `${call.table}-${rows.length + 1}`, attempts: 0, used_at: null, created_at: String(rows.length), ...(call.payload as object) })
        return { data: null, error: null }
      }
      const hit = rows.filter((row) => matches(row, call))
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
    db.supplierRows = []
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

  it('keeps supplier codes in their own table, signing in that supplier only', async () => {
    const code = await issueLoginCode('s1', 'supplier')
    expect(db.rows).toHaveLength(0)
    expect(db.supplierRows).toHaveLength(1)
    expect(db.supplierRows[0].supplier_id).toBe('s1')
    expect(await consumeLoginCode('s2', code, 'supplier')).toBe(false)
    expect(await consumeLoginCode('s1', code, 'supplier')).toBe(true)
    expect(await consumeLoginCode('s1', code, 'supplier')).toBe(false)
  })

  it("never lets a carpentry's code pass as a supplier's", async () => {
    const code = await issueLoginCode('x1')
    expect(await consumeLoginCode('x1', code, 'supplier')).toBe(false)
    expect(await consumeLoginCode('x1', code)).toBe(true)
  })
})
