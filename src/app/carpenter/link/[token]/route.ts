import { NextRequest, NextResponse } from 'next/server'
import { resolveCarpenter } from '@/lib/offer'
import { buildCarpenterCookie } from '@/lib/carpenter-auth'

/**
 * The personal link, when there is no campaign to show: sign this browser in
 * and land on the carpentry's home screen, not on a page of products.
 *
 * The same exchange /o/[token] always did through /api/carpenter/session,
 * done on the server so the first screen is already signed in. Unlike the
 * emailed login link (/carpenter/enter) it sends no new-device notice: this
 * is the link the carpentry was handed at registration, and opening it never
 * sent one.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const carpenter = await resolveCarpenter(token)
  if (!carpenter) return NextResponse.redirect(new URL('/join?link=invalid', request.url))

  const response = NextResponse.redirect(new URL('/app', request.url))
  response.cookies.set(buildCarpenterCookie(carpenter.id))
  return response
}
