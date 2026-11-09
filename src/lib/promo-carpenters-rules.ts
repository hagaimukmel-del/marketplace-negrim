/**
 * "מוצר השבוע" to the carpentries by mail (owner, 2026-11-09), as rules.
 *
 * Every Sunday at 07:00 Israel time, next to the owner's social-post mail,
 * each carpentry that agreed to receive offers by mail gets one email about
 * the week's approved product. Only those that agreed: Israeli law
 * (חוק התקשורת, סעיף 30א) forbids advertising mail without prior consent, and
 * requires the word "פרסומת" in the subject and a way to refuse in every mail.
 *
 * No database and no server imports, so the rules are tested on their own.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface MarketingRecipient {
  email: string | null
  email_verified_at: string | null
  is_active: boolean
  deleted_at: string | null
  marketing_consent: boolean
}

/**
 * Whether a carpentry may get the weekly mail: active, not deleted, agreed to
 * offers by mail, and with an address it proved it reads (an unverified one
 * may be a typo that belongs to someone else).
 */
export function mayMarket(r: MarketingRecipient | null): r is MarketingRecipient & { email: string } {
  return Boolean(r && r.is_active && !r.deleted_at && r.marketing_consent && r.email && r.email_verified_at)
}

/** The key the mailing is claimed under in reminder_log, so a week's booking goes to the carpentries once. */
export function carpentersKey(promoId: string): string {
  return `promo-carpenters:${promoId}`
}

/** The subject. The law asks for "פרסומת" at its start. */
export function promoCarpentersSubject(productName: string): string {
  return `פרסומת: מוצר השבוע בנגרים B2B - ${productName}`
}

/**
 * Sends per second. Resend allows 2 requests a second by default; a little
 * under it, so the mailing does not crowd out an order's mail sent meanwhile.
 */
export const PROMO_SEND_PACE_MS = 600

const PURPOSE = 'marketing-unsubscribe.v1'

/** The signature on the one-click "remove me" link: only our emails carry a valid one. */
export function marketingUnsubscribeSignature(carpenterId: string, secret: string): string {
  const key = createHmac('sha256', secret).update(PURPOSE).digest()
  return createHmac('sha256', key).update(carpenterId).digest('base64url').slice(0, 32)
}

export function isMarketingUnsubscribeSignature(carpenterId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(marketingUnsubscribeSignature(carpenterId, secret))
  const actual = Buffer.from(signature)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
