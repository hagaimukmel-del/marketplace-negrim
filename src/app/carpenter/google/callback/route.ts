import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { buildCarpenterCookie } from '@/lib/carpenter-auth'
import { STATE_COOKIE, exchangeCode, googleConfigured } from '@/lib/google-auth'
import { findCarpenterByIdentifier } from '@/lib/login-code'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function sameState(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Back from Google. A verified Google email that is a carpentry's email on
 * file signs this browser in, and confirms that email the way the emailed
 * link does: Google has just shown the person owns the inbox. Anything else
 * lands on /join with a notice; a Google account never creates a carpentry.
 */
export async function GET(request: NextRequest) {
  const fail = (reason: 'failed' | 'unknown') => {
    const response = NextResponse.redirect(new URL(`/join?google=${reason}`, request.url))
    response.cookies.set({ name: STATE_COOKIE, value: '', path: '/carpenter/google', maxAge: 0 })
    return response
  }

  if (!googleConfigured()) return NextResponse.redirect(new URL('/join', request.url))

  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const state = params.get('state')
  const expected = request.cookies.get(STATE_COOKIE)?.value
  if (!code || !state || !expected || !sameState(state, expected)) return fail('failed')

  try {
    const email = await exchangeCode(code, request.url)
    if (!email) return fail('failed')

    const carpenter = await findCarpenterByIdentifier(email)
    if (!carpenter) return fail('unknown')

    if (!carpenter.email_verified_at) {
      await getSupabaseAdmin().from('carpenters').update({ email_verified_at: new Date().toISOString() }).eq('id', carpenter.id)
    }

    const response = NextResponse.redirect(new URL('/app', request.url))
    response.cookies.set({ name: STATE_COOKIE, value: '', path: '/carpenter/google', maxAge: 0 })
    response.cookies.set(buildCarpenterCookie(carpenter.id))
    return response
  } catch (err) {
    console.error('Google sign-in failed:', err)
    return fail('failed')
  }
}
