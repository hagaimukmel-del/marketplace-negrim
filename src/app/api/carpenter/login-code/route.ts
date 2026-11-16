import { NextRequest, NextResponse } from 'next/server'
import { buildCarpenterCookie } from '@/lib/carpenter-auth'
import { consumeLoginCode, findCarpenterByIdentifier } from '@/lib/login-code'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { buildSupplierCookie } from '@/lib/supplier-auth'
import { findApprovedSupplierByEmail } from '@/lib/supplier-login'
import { checkRateLimit, getRateLimitHeaders, getClientIP, hashIdentifier } from '@/lib/rate-limit'

const WRONG = 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.'

/**
 * The code from the login email, typed on the page that asked for it.
 *
 * The carpenter is found again from what they typed in the first step, so
 * the page holds nothing but that. Every failure gets the same answer, so
 * this cannot tell anyone who is registered. Guessing is capped twice: per
 * code in the database (lib/login-code) and per network here.
 *
 * The code came from the carpentry's inbox, so like the emailed link with
 * its proof it also confirms the email. No new-device notice: the person who
 * got in just read the code in that inbox.
 */
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`login-code-ip:${hashIdentifier(getClientIP(request))}`, 'loginCode')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות' }, { status: 429, headers: getRateLimitHeaders(limit) })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
  const code = typeof body.code === 'string' ? body.code : ''
  if (!identifier || !code) return NextResponse.json({ error: 'צריך את הקוד מהמייל' }, { status: 400 })

  try {
    const carpenter = await findCarpenterByIdentifier(identifier)

    // A supplier who asked for a code on this page got their supplier code
    // (see /api/carpenter/login-link). Only when no carpentry holds the email,
    // exactly as the code was issued.
    if (!carpenter && identifier.includes('@')) {
      const supplier = await findApprovedSupplierByEmail(identifier)
      if (!supplier || !(await consumeLoginCode(supplier.id, code, 'supplier'))) {
        return NextResponse.json({ error: WRONG }, { status: 400 })
      }
      const response = NextResponse.json({ ok: true, redirect: '/supplier' })
      response.cookies.set(buildSupplierCookie(supplier.id, 'own'))
      return response
    }

    if (!carpenter || !(await consumeLoginCode(carpenter.id, code))) {
      return NextResponse.json({ error: WRONG }, { status: 400 })
    }

    if (carpenter.email && !carpenter.email_verified_at) {
      await getSupabaseAdmin().from('carpenters').update({ email_verified_at: new Date().toISOString() }).eq('id', carpenter.id)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(buildCarpenterCookie(carpenter.id))
    return response
  } catch (err) {
    console.error('Carpenter login code failed:', err)
    return NextResponse.json({ error: WRONG }, { status: 400 })
  }
}
