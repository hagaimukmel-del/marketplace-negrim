import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const touched = vi.hoisted(() => ({ db: false }))

vi.mock('@/lib/carpenter-auth', () => ({ getSessionCarpenter: async () => ({ id: 'c1', business_name: 'נגריית בדיקה' }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock('@/lib/rate-limit-shared', () => ({ sharedLimitReached: async () => false }))
vi.mock('@/lib/messages', () => ({ startThread: async () => ({ ok: true, threadId: 't1' }) }))
vi.mock('@/lib/email', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/email')>()), sendEmail: async () => ({ sent: true }) }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    touched.db = true
    throw new Error('the database is not reached in these tests')
  },
}))

const { POST } = await import('./route')
const SUPPLIER = '22222222-2222-4222-8222-222222222222'

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/carpenter/contact-supplier', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/carpenter/contact-supplier', () => {
  it('refuses a free-text quote request, so the quote rules cannot be skipped', async () => {
    const response = await post({ supplierId: SUPPLIER, action: 'quote_request', message: 'מחיר ל־1000 ק״ג?' })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('use_quote_request')
    expect(touched.db).toBe(false)
  })

  it('still lets a question through to the database', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await post({ supplierId: SUPPLIER, action: 'inquiry', message: 'יש במלאי?' })
    // The fake database throws; reaching it is what this checks.
    expect(touched.db).toBe(true)
    expect(response.status).toBe(500)
  })
})
