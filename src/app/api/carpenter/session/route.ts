import { NextRequest, NextResponse } from 'next/server'
import { resolveCarpenter } from '@/lib/offer'
import {
  buildCarpenterCookie,
  clearCarpenterCookie,
  getSessionCarpenter,
} from '@/lib/carpenter-auth'

/**
 * Exchange a personal link for a session.
 *
 * The carpenter holds a token; the server needs something it minted itself
 * before it will show a price. This is the one place that trade happens: the
 * token is resolved against the database, and only then is a signed cookie
 * issued naming the carpenter it actually belongs to.
 *
 * A bad token gets 404 and no cookie. There is nothing here to brute-force
 * that holding the link would not already give you.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'חסר קישור אישי' }, { status: 400 })
    }

    const carpenter = await resolveCarpenter(token)
    if (!carpenter) {
      return NextResponse.json({ error: 'קישור לא מוכר' }, { status: 404 })
    }

    const response = NextResponse.json({
      ok: true,
      business_name: carpenter.business_name,
    })
    response.cookies.set(buildCarpenterCookie(carpenter.id))
    return response
  } catch (err) {
    console.error('Carpenter session failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/** Who this browser is signed in as, for the header to render a name. */
export async function GET() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ signedIn: false })

  return NextResponse.json({
    signedIn: true,
    business_name: carpenter.business_name,
    token: carpenter.token,
  })
}

/** Sign out — on a shared computer, or to test what a stranger sees. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearCarpenterCookie())
  return response
}
