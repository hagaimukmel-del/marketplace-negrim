import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Operator gate for /admin.
 *
 * One person runs this console, so it is a passphrase rather than an account
 * system. What matters is that the check happens on the server: every admin
 * page is a Server Component that calls requireAdmin() before it reads
 * anything, and every admin route handler does the same. There is no
 * client-side redirect to bypass, and no admin data reaches the browser unless
 * the cookie already verified.
 *
 * The cookie holds an HMAC of an expiry, not the passphrase, so it cannot be
 * replayed past its lifetime and the secret never leaves the server.
 *
 * Set ADMIN_PASSWORD and ADMIN_SECRET in .env.local. Without them the console
 * refuses to open at all rather than defaulting to something guessable.
 */

const COOKIE = 'negrim_admin'
const MAX_AGE_SECONDS = 60 * 60 * 12

function secret(): string {
  const value = process.env.ADMIN_SECRET
  if (!value || value.length < 16) {
    throw new Error(
      'ADMIN_SECRET is missing or too short (needs 16+ characters). Add it to .env.local.'
    )
  }
  return value
}

function sign(expiresAt: number): string {
  return createHmac('sha256', secret()).update(String(expiresAt)).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function checkPassword(candidate: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || expected.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD is missing or too short (needs 8+ characters). Add it to .env.local.'
    )
  }
  if (typeof candidate !== 'string' || candidate.length === 0) return false
  return safeEqual(candidate, expected)
}

export function buildSessionCookie() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  return {
    name: COOKIE,
    value: `${expiresAt}.${sign(expiresAt)}`,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function clearSessionCookie() {
  return { ...buildSessionCookie(), value: '', maxAge: 0 }
}

export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return false

  const [expiresAt, signature] = raw.split('.')
  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false
  if (!signature) return false

  try {
    return safeEqual(signature, sign(expiry))
  } catch {
    return false
  }
}
