import { NextRequest, NextResponse } from 'next/server'
import { buildSessionCookie, checkPassword, clearSessionCookie } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!checkPassword(password)) {
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
