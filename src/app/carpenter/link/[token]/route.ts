import { NextRequest, NextResponse } from 'next/server'
import { resolveCarpenter } from '@/lib/offer'
import { buildCarpenterCookie } from '@/lib/carpenter-auth'
import { safeNext } from '@/lib/notification-links'

/**
 * The personal link, when there is no campaign to show: sign this browser in
 * and land on the carpentry's home screen, not on a page of products.
 *
 * The same exchange /o/[token] always did through /api/carpenter/session,
 * done on the server so the first screen is already signed in. Unlike the
 * emailed login link (/carpenter/enter) it sends no new-device notice: this
 * is the link the carpentry was handed at registration, and opening it never
 * sent one.
 *
 * Right after registration it may carry `next` (only a path inside /app): the
 * page whose contact button led to registration, so the carpentry lands back there.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const carpenter = await resolveCarpenter(token)
  if (!carpenter) return NextResponse.redirect(new URL('/join?link=invalid', request.url))

  const next = safeNext(request.nextUrl.searchParams.get('next'), '/app') ?? '/app'
  const response = NextResponse.redirect(new URL(next, request.url))
  response.cookies.set(buildCarpenterCookie(carpenter.id))
  return response
}
