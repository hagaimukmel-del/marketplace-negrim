import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Who the carpenter is, in a form the server can check on any page.
 *
 * The personal link in /o/[token] has always been the whole identity, but it
 * only proved anything on that one page. Everywhere else the carpenter was
 * anonymous, and the browser's own memory of the token (lib/carpenter-session)
 * is not something a server can act on — a client-supplied token is a claim,
 * not proof.
 *
 * That was fine while prices were public. It stops being fine the moment
 * prices are only for people who registered: hiding them in the markup would
 * be theatre, since the browser fetches them itself. The server has to decide,
 * and to decide it has to know who is asking.
 *
 * So the token is exchanged once, server-side, for a signed cookie naming the
 * carpenter. The cookie is proof because we minted it; the token stays the
 * thing the carpenter actually holds.
 *
 * This is deliberately NOT a password. Anyone with the link already has that
 * carpenter's page — that is the design, and it is what makes registration take
 * ten seconds. The cookie grants exactly what the link already granted, for
 * longer, without asking them to keep finding the link.
 */

const COOKIE = 'negrim_carpenter'
const PURPOSE = 'carpenter-session.v1'

/**
 * Six months. A carpenter's link is their account, so logging them out is pure
 * friction with nothing gained — they would simply open the link again.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * Derived from ADMIN_SECRET rather than a second secret to configure. The
 * label is what stops one of these ever verifying as an admin cookie or a
 * supplier confirmation link: different label, different key.
 */
function key(): Buffer {
  const value = process.env.ADMIN_SECRET
  if (!value || value.length < 16) {
    throw new Error(
      'ADMIN_SECRET is missing or too short (needs 16+ characters). Add it to .env.local.'
    )
  }
  return createHmac('sha256', value).update(PURPOSE).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', key()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function buildCarpenterCookie(carpenterId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `${carpenterId}.${expiresAt}`
  return {
    name: COOKIE,
    value: `${payload}.${sign(payload)}`,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function clearCarpenterCookie() {
  return { ...buildCarpenterCookie('x'), value: '', maxAge: 0 }
}

/**
 * The carpenter id this browser has proved, or null. Signature and expiry only
 * — it does not touch the database, so it is cheap enough to call on any page.
 */
export async function getCarpenterId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null

  const [carpenterId, expiresAt, signature] = parts
  const expiry = Number(expiresAt)
  if (!carpenterId || !Number.isFinite(expiry) || expiry < Date.now()) return null

  try {
    return safeEqual(signature, sign(`${carpenterId}.${expiresAt}`)) ? carpenterId : null
  } catch {
    return null
  }
}

export interface SessionCarpenter {
  id: string
  token: string
  business_name: string
  contact_name: string | null
  phone: string | null
  city: string | null
}

/**
 * The carpenter behind the cookie, re-read from the database every time.
 *
 * The signature proves which id the browser holds; it cannot prove the account
 * still exists or is still active. One deactivated carpenter should not keep
 * seeing prices for six months because their cookie is still in date.
 */
export async function getSessionCarpenter(): Promise<SessionCarpenter | null> {
  const id = await getCarpenterId()
  if (!id) return null

  const { data } = await getSupabaseAdmin()
    .from('carpenters')
    .select('id, token, business_name, contact_name, phone, city')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  return data ?? null
}

/** Whether prices may be shown. One question, asked in one place. */
export async function canSeePrices(): Promise<boolean> {
  return (await getCarpenterId()) !== null
}
