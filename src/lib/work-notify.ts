/**
 * נגרים עובדים ביחד, phase 3: who gets an email, and when.
 *
 * No database and no server imports, so the rules are tested on their own.
 * The server side (work-notify-server.ts) loads the rows and sends.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type NotifyKind = 'job_match' | 'answer' | 'message'

/**
 * Emails a carpentry gets in a day, all kinds together. Above it nothing is
 * sent until tomorrow; everything is still on the site. Far above an honest
 * day, low enough that a busy board cannot flood an inbox.
 */
export const NOTIFY_PER_DAY = 5

export interface NotifyRecipient {
  email: string | null
  email_verified_at: string | null
  is_active: boolean
  notify_email: boolean
}

/**
 * Whether a carpentry may be emailed at all: active, opted in, and with an
 * address it proved it reads. An unverified address may be a typo that
 * belongs to someone else.
 */
export function mayEmail(recipient: NotifyRecipient | null): recipient is NotifyRecipient & { email: string } {
  return Boolean(recipient && recipient.is_active && recipient.notify_email && recipient.email && recipient.email_verified_at)
}

export function underCap(sentToday: number): boolean {
  return sentToday < NOTIFY_PER_DAY
}

export interface MatchProfile {
  job_types: string[]
  regions: string[]
}

/** A job fits a profile when the carpentry does that kind of work in that region. */
export function fitsJob(profile: MatchProfile, job: { job_type: string; region: string }): boolean {
  return profile.job_types.includes(job.job_type) && profile.regions.includes(job.region)
}

/**
 * One email per run of unread messages: the first message after the
 * recipient last read the conversation is emailed, the ones after it are not
 * until they open it again.
 */
export function notifyForMessage(lastNotifiedAt: string | null, recipientReadAt: string | null): boolean {
  if (!lastNotifiedAt) return true
  if (!recipientReadAt) return false
  return new Date(recipientReadAt) > new Date(lastNotifiedAt)
}

/** The applicant's first message opens the conversation: that is an answer, not a message. */
export function kindForMessage(sender: 'poster' | 'applicant', messageCount: number): NotifyKind {
  return sender === 'applicant' && messageCount <= 1 ? 'answer' : 'message'
}

const PURPOSE = 'work-unsubscribe.v1'

/** The signature on a one-click unsubscribe link: only our emails carry a valid one. */
export function unsubscribeSignature(carpenterId: string, secret: string): string {
  const key = createHmac('sha256', secret).update(PURPOSE).digest()
  return createHmac('sha256', key).update(carpenterId).digest('base64url').slice(0, 32)
}

export function isUnsubscribeSignature(carpenterId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(unsubscribeSignature(carpenterId, secret))
  const actual = Buffer.from(signature)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
