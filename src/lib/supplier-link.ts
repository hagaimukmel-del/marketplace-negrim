import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * A one-purpose link that lets a supplier act without an account.
 *
 * Suppliers have no login, and the single action the marketplace actually needs
 * from them is confirming an order. Waiting for an account system before they
 * can do that would mean orders sit unanswered for weeks — so the confirmation
 * travels in the email as a signed link.
 *
 * The link names one order and one supplier and expires. It is not a session:
 * it cannot be used to read anything else, and it grants nothing beyond
 * confirming the order it was minted for.
 *
 * Known and accepted: an email can be forwarded, so anyone holding the link can
 * confirm that order. That is the same trade every magic link makes, and it is
 * the right one here — the alternative is an order nobody confirms at all.
 */

const PURPOSE = 'supplier-confirm.v1'
const DEFAULT_TTL_DAYS = 30

/**
 * A key derived from ADMIN_SECRET rather than a second secret to configure.
 * The label is what keeps these tokens from ever verifying as an admin session
 * cookie, or the other way round: different label, different key.
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

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
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

export interface ConfirmClaim {
  orderId: string
  supplierId: string
  expiresAt: number
}

/** Mint the token that goes in the email. */
export function mintConfirmToken(
  orderId: string,
  supplierId: string,
  ttlDays = DEFAULT_TTL_DAYS
): string {
  const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000
  const payload = base64url(JSON.stringify({ o: orderId, s: supplierId, e: expiresAt }))
  return `${payload}.${sign(payload)}`
}

/**
 * Returns the claim, or null for anything at all wrong with the token —
 * tampered, expired, malformed, or signed with a different secret. Callers get
 * one answer, so a bad token cannot be told apart from an expired one by
 * probing.
 */
export function readConfirmToken(token: string): ConfirmClaim | null {
  if (typeof token !== 'string' || !token.includes('.')) return null

  const separator = token.lastIndexOf('.')
  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!payload || !signature) return null

  try {
    if (!safeEqual(signature, sign(payload))) return null

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const orderId = parsed?.o
    const supplierId = parsed?.s
    const expiresAt = Number(parsed?.e)

    if (typeof orderId !== 'string' || typeof supplierId !== 'string') return null
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

    return { orderId, supplierId, expiresAt }
  } catch {
    return null
  }
}

/** The absolute URL that goes in the email body. */
export function confirmUrl(orderId: string, supplierId: string, baseUrl: string): string {
  const token = mintConfirmToken(orderId, supplierId)
  return `${baseUrl.replace(/\/$/, '')}/supplier/confirm/${token}`
}
