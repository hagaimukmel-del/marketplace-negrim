import { NextRequest, NextResponse } from 'next/server'
import { resolveCarpenter } from '@/lib/offer'
import { buildCarpenterCookie, isEmailProof } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * The login link from the email: open it on any device and that device is in.
 *
 * The token is checked against the database first; an unknown or blocked one
 * gets no cookie and lands on the sign-up page with a notice.
 *
 * A link that carries `v`, the proof minted for the address it was mailed to,
 * also confirms the carpentry's email: the link could only have come from that
 * inbox. A new carpentry's orders reach suppliers only after that.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const carpenter = await resolveCarpenter(token)

  if (!carpenter) {
    return NextResponse.redirect(new URL('/join?link=invalid', request.url))
  }

  const proof = request.nextUrl.searchParams.get('v')
  const confirms = Boolean(proof && carpenter.email && !carpenter.email_verified_at && isEmailProof(token, carpenter.email, proof))
  if (confirms) {
    await getSupabaseAdmin().from('carpenters').update({ email_verified_at: new Date().toISOString() }).eq('id', carpenter.id)
  }

  const response = NextResponse.redirect(new URL(confirms ? '/app?verified=1' : '/app', request.url))
  response.cookies.set(buildCarpenterCookie(carpenter.id))
  return response
}
