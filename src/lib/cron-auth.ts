import 'server-only'

import { timingSafeEqual } from 'node:crypto'

/**
 * Vercel calls a scheduled route with `Authorization: Bearer $CRON_SECRET`.
 * Without the secret configured every request is refused: an open endpoint
 * that sends mail is an invitation.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
