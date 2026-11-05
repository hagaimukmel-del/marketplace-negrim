import { NextRequest, NextResponse } from 'next/server'
import { buildSupplierCookie } from '@/lib/supplier-auth'
import { consumeLoginCode } from '@/lib/login-code'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit, getRateLimitHeaders, getClientIP, hashIdentifier } from '@/lib/rate-limit'

const WRONG = 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.'

/**
 * The code from the supplier login email, typed on the page that asked for it.
 *
 * The supplier is found again from the email typed in the first step, so the
 * page holds nothing but that. Every failure gets the same answer, so this
 * cannot tell anyone which addresses are suppliers. Guessing is capped twice:
 * per code in the database (lib/login-code) and per network here.
 *
 * Only an approved supplier gets in, as with the entry link. No new-device
 * notice: the person who got in just read the code in that inbox.
 */
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`supplier-code-ip:${hashIdentifier(getClientIP(request))}`, 'loginCode')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות' }, { status: 429, headers: getRateLimitHeaders(limit) })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body.code === 'string' ? body.code : ''
  if (!email || !code) return NextResponse.json({ error: 'צריך את הקוד מהמייל' }, { status: 400 })

  try {
    // Matched as /api/supplier/login-link matched it, so the code goes to the
    // same supplier it was issued for.
    const pattern = email.replace(/[\\%_]/g, (char: string) => `\\${char}`)
    const { data: supplier } = await getSupabaseAdmin()
      .from('suppliers')
      .select('id')
      .ilike('email', pattern)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()

    if (!supplier || !(await consumeLoginCode(supplier.id, code, 'supplier'))) {
      return NextResponse.json({ error: WRONG }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(buildSupplierCookie(supplier.id, 'own'))
    return response
  } catch (err) {
    console.error('Supplier login code failed:', err)
    return NextResponse.json({ error: WRONG }, { status: 400 })
  }
}
