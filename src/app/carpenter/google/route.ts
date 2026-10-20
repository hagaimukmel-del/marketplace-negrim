import { NextRequest, NextResponse } from 'next/server'
import { STATE_COOKIE, authorizeUrl, googleConfigured, newState } from '@/lib/google-auth'

/**
 * "כניסה עם גוגל": off to Google's account picker. The state cookie is what
 * the callback checks, so a code Google hands back is only accepted by the
 * browser that asked for it.
 */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL('/join', request.url))

  const state = newState()
  const response = NextResponse.redirect(authorizeUrl(request.url, state))
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/carpenter/google',
    maxAge: 10 * 60,
  })
  return response
}
