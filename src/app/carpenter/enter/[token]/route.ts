import { NextRequest, NextResponse } from 'next/server'
import { resolveCarpenter } from '@/lib/offer'
import { buildCarpenterCookie } from '@/lib/carpenter-auth'

/**
 * The login link from the email: open it on any device and that device is in.
 *
 * The token is checked against the database first; an unknown or blocked one
 * gets no cookie and lands on the sign-up page with a notice.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const carpenter = await resolveCarpenter(token)

  if (!carpenter) {
    return NextResponse.redirect(new URL('/join?link=invalid', request.url))
  }

  const response = NextResponse.redirect(new URL('/app', request.url))
  response.cookies.set(buildCarpenterCookie(carpenter.id))
  return response
}
