import { NextRequest, NextResponse } from 'next/server'
import { buildSessionCookie, checkPassword, clearSessionCookie } from '@/lib/admin-auth'
import {
  checkLoginThrottle,
  recordLoginAttempt,
  THROTTLE_WINDOW_MINUTES,
} from '@/lib/login-throttle'

export async function POST(request: NextRequest) {
  try {
    // Asked before the password is even looked at, so a blocked address cannot
    // use the endpoint's timing to learn anything about the guess it sent.
    const throttle = await checkLoginThrottle(request)
    if (throttle.blocked) {
      return NextResponse.json(
        {
          error: `יותר מדי ניסיונות. נסה שוב בעוד ${THROTTLE_WINDOW_MINUTES} דקות.`,
        },
        { status: 429 }
      )
    }

    const { password } = await request.json()
    const ok = checkPassword(password)
    await recordLoginAttempt(throttle.ip, ok)

    if (!ok) {
      // Deliberately vague, and no hint about which half was wrong.
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(buildSessionCookie())
    return response
  } catch (err) {
    // A missing ADMIN_SECRET / ADMIN_PASSWORD throws here; surface it as a
    // configuration problem rather than a failed login.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearSessionCookie())
  return response
}
