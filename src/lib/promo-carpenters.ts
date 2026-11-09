import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, siteUrl } from './email'
import { processOutbox, queueEmails, type QueuedEmail } from './outbox'
import { loadCurrentPromo } from './promo'
import { loadPromoDetails, type PromoDetails } from './promo-social'
import { isSocialHour } from './promo-social-rules'
import {
  PROMO_SEND_PACE_MS,
  carpentersKey,
  marketingUnsubscribeSignature,
  mayMarket,
  promoCarpentersSubject,
  type MarketingRecipient,
} from './promo-carpenters-rules'
import { PROMO_REQUEST_EMAIL } from './emails/promo-request'
import { promoCarpentersHtml } from './emails/promo-carpenters'

/**
 * Sunday morning: this week's "מוצר השבוע" to every carpentry that agreed to
 * offers by mail (owner, 2026-11-09). Run by /api/cron/promo-social right
 * after the owner's social-post mail, or by the operator from
 * /admin/promotions for a week set after Sunday.
 *
 * The mailing is claimed in reminder_log under the booking's id before
 * anything is queued, so a booking reaches each carpentry once whatever runs
 * it. The mails go through the outbox (retries, bounced addresses skipped)
 * and are sent here at a pace the provider accepts; whatever is left when the
 * run's time is up is sent by the outbox's later runs.
 */

/** Far above the carpentries for a long time; a safety stop, not a plan. */
const RECIPIENT_LIMIT = 5000

/** How long one run keeps sending before leaving the rest to the outbox. */
const SEND_WINDOW_MS = 240_000

export type PromoCarpentersResult =
  | { queued: number; sent: number; key: string }
  | { queued: 0; reason: 'not-social-hour' | 'no-promo' | 'no-secret' | 'already-sent' | 'no-log' | 'no-product' | 'failed'; key?: string }

function secret(): string | null {
  const value = process.env.ADMIN_SECRET
  return value && value.length >= 16 ? value : null
}

function contactEmail(): string {
  return process.env.CONTACT_EMAIL || process.env.EMAIL_REPLY_TO || PROMO_REQUEST_EMAIL
}

export function unsubscribeUrl(carpenterId: string, key: string): string {
  return `${siteUrl()}/api/promo/unsubscribe?c=${carpenterId}&t=${marketingUnsubscribeSignature(carpenterId, key)}`
}

interface RecipientRow extends MarketingRecipient {
  id: string
  business_name: string
}

/** The carpentries the weekly mail goes to now. */
export async function loadPromoRecipients(): Promise<(RecipientRow & { email: string })[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('carpenters')
    .select('id, business_name, email, email_verified_at, is_active, deleted_at, marketing_consent')
    .eq('marketing_consent', true)
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('email', 'is', null)
    .limit(RECIPIENT_LIMIT)
  if (error) {
    console.error('[promo-carpenters] recipients', error)
    return []
  }
  return (data ?? []).filter((row): row is RecipientRow & { email: string } => mayMarket(row))
}

/** Whether this booking was already mailed to the carpentries. */
export async function promoCarpentersSent(promoId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from('reminder_log').select('key').eq('key', carpentersKey(promoId)).maybeSingle()
  return Boolean(data)
}

function mailFor(details: PromoDetails, unsubscribe: string) {
  return {
    subject: promoCarpentersSubject(details.productName),
    html: promoCarpentersHtml({ ...details, unsubscribeUrl: unsubscribe, contactEmail: contactEmail() }),
  }
}

/** Send what is queued, at the provider's pace, until the queue is empty or the time is up. */
async function sendPaced(windowMs: number): Promise<number> {
  const until = Date.now() + windowMs
  let sent = 0
  while (Date.now() < until) {
    const result = await processOutbox({ limit: 10, paceMs: PROMO_SEND_PACE_MS })
    sent += result.sent
    if (result.claimed === 0) break
    await new Promise((resolve) => setTimeout(resolve, PROMO_SEND_PACE_MS))
  }
  return sent
}

/**
 * Queue and send this week's mail to the carpentries. `anyHour` lets the
 * operator run it outside Sunday 07:00; the once-per-booking claim holds
 * either way.
 */
export async function runPromoCarpenters(now: Date = new Date(), { anyHour = false } = {}): Promise<PromoCarpentersResult> {
  if (!anyHour && !isSocialHour(now)) return { queued: 0, reason: 'not-social-hour' }

  const promo = await loadCurrentPromo(now)
  if (!promo) return { queued: 0, reason: 'no-promo' }
  const key = secret()
  if (!key) return { queued: 0, reason: 'no-secret' }

  const claim = carpentersKey(promo.id)
  const supabase = getSupabaseAdmin()
  const { data: claimed, error } = await supabase
    .from('reminder_log')
    .upsert([{ key: claim }], { onConflict: 'key', ignoreDuplicates: true })
    .select('key')
  if (error) {
    console.error('[promo-carpenters] claim failed', error)
    return { queued: 0, reason: 'no-log', key: claim }
  }
  if (!claimed || claimed.length === 0) return { queued: 0, reason: 'already-sent', key: claim }

  let queued = 0
  try {
    const details = await loadPromoDetails(promo)
    if (!details) {
      await supabase.from('reminder_log').delete().eq('key', claim)
      return { queued: 0, reason: 'no-product', key: claim }
    }
    const recipients = await loadPromoRecipients()
    const emails: QueuedEmail[] = recipients.map((carpenter) => ({
      kind: 'promo_week',
      to: carpenter.email,
      ...mailFor(details, unsubscribeUrl(carpenter.id, key)),
      isTest: isTestName(carpenter.business_name, details.supplierName),
    }))
    queued = await queueEmails(emails, { sendNow: false })
  } catch (err) {
    console.error('[promo-carpenters] failed', err)
    // Nothing queued yet: release the claim so a later run can try again.
    if (queued === 0) await supabase.from('reminder_log').delete().eq('key', claim)
    return { queued: 0, reason: 'failed', key: claim }
  }

  const sent = await sendPaced(SEND_WINDOW_MS)
  return { queued, sent, key: claim }
}

/** One copy to the owner's inbox, to see the mail before the carpentries do. */
export async function sendPromoCarpentersSample(now: Date = new Date()): Promise<'sent' | 'no-promo' | 'failed'> {
  const promo = await loadCurrentPromo(now)
  if (!promo) return 'no-promo'
  const details = await loadPromoDetails(promo)
  if (!details) return 'failed'
  const { subject, html } = mailFor(details, `${siteUrl()}/app/account`)
  const queued = await queueEmails([{ kind: 'promo_week_sample', to: PROMO_REQUEST_EMAIL, subject: `[דוגמה] ${subject}`, html }])
  return queued > 0 ? 'sent' : 'failed'
}
