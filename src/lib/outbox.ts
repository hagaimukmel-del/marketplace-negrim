import 'server-only'

import { after } from 'next/server'
import { getSupabaseAdmin } from './supabase-admin'
import { sendEmail } from './email'
import { outcomeOf, withinDedupeWindow } from './outbox-rules'
import type { Database } from './database.types'

type OutboxRow = Database['public']['Tables']['email_outbox']['Row']

/**
 * The email outbox (communication plan, step 1).
 *
 * Every mail the site owes a carpenter or a supplier is first written to
 * `email_outbox`, then sent. Writing comes first so that nothing is lost when
 * the provider is slow or down: the row waits, and the next run picks it up.
 *
 * A mail is tried right after the request that queued it ends (after()), so
 * the person who placed the order never waits for the mail provider. Failed
 * tries are picked up again by every later run: the next queued mail, and the
 * scheduled run at /api/cron/outbox.
 *
 * On a database without the table (before migration 20261025120000 reaches
 * it) the mail is sent directly, the way it was before, so an order never
 * loses its email to a missing table.
 */

export interface QueuedEmail {
  kind: string
  to: string
  subject: string
  html: string
  isTest?: boolean
  replyTo?: string | null
  notificationId?: string | null
  /** Fold into one mail with any other carrying this key within ten minutes. */
  dedupeKey?: string
}

/** How many rows one run sends; a run must finish well inside a function's time limit. */
const RUN_LIMIT = 20

/** Run the work after the response is sent, or right away outside a request (scripts, tests). */
function later(work: () => Promise<unknown>): void {
  const run = () => work().catch((err) => console.error('[outbox] run failed', err))
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * Queue mails and start sending them once the current request is done.
 * Returns how many were queued (held-back duplicates are not counted).
 */
export async function queueEmails(emails: QueuedEmail[]): Promise<number> {
  const wanted = emails.filter((email) => email.to)
  if (wanted.length === 0) return 0
  const supabase = getSupabaseAdmin()

  const rows: Database['public']['Tables']['email_outbox']['Insert'][] = []
  for (const email of wanted) {
    if (email.dedupeKey) {
      const { data: last } = await supabase
        .from('email_outbox')
        .select('created_at')
        .eq('dedupe_key', email.dedupeKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (withinDedupeWindow(last?.created_at)) continue
    }
    rows.push({
      kind: email.kind,
      to_email: email.to,
      subject: email.subject,
      html: email.html,
      is_test: email.isTest ?? false,
      reply_to: email.replyTo ?? null,
      notification_id: email.notificationId ?? null,
      dedupe_key: email.dedupeKey ?? null,
    })
  }
  if (rows.length === 0) return 0

  const { data, error } = await supabase.from('email_outbox').insert(rows).select('id')
  if (error || !data) {
    console.error('[outbox] queue failed, sending directly', error)
    for (const row of rows) {
      await sendEmail({ to: row.to_email, subject: row.subject, html: row.html, isTest: row.is_test, replyTo: row.reply_to })
    }
    return rows.length
  }

  const ids = data.map((row) => row.id)
  // These first, then anything else that is due while we are at it.
  later(async () => {
    await processOutbox({ ids })
    await processOutbox()
  })
  return rows.length
}

/** Queue one mail. */
export async function queueEmail(email: QueuedEmail): Promise<boolean> {
  return (await queueEmails([email])) > 0
}

async function sendRow(row: OutboxRow): Promise<'sent' | 'pending' | 'failed' | 'skipped'> {
  const supabase = getSupabaseAdmin()
  const result = await sendEmail({
    to: row.to_email,
    subject: row.subject,
    html: row.html,
    isTest: row.is_test,
    replyTo: row.reply_to,
    idempotencyKey: `outbox-${row.id}`,
  })
  const outcome = outcomeOf(result, row.attempts)
  await supabase
    .from('email_outbox')
    .update({
      status: outcome.status,
      locked_at: null,
      ...(outcome.nextAttemptAt ? { next_attempt_at: outcome.nextAttemptAt.toISOString() } : {}),
      ...(result.sent ? { sent_at: new Date().toISOString(), provider_id: result.providerId ?? null, last_error: null } : {}),
      ...(!result.sent ? { last_error: (result.error ?? result.reason ?? 'unknown').slice(0, 500) } : {}),
    })
    .eq('id', row.id)
  if (outcome.status === 'failed') await tellOperator(row, result.error ?? result.reason ?? 'unknown')
  return outcome.status
}

/**
 * The operator hears about a mail that will not go out, once, when it is
 * given up on. Sent directly, not queued: a broken provider must not grow a
 * queue of mails about itself.
 */
async function tellOperator(row: OutboxRow, error: string): Promise<void> {
  const operator = process.env.ADMIN_EMAIL || process.env.EMAIL_REPLY_TO
  if (!operator) return
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  await sendEmail({
    to: operator,
    subject: `מייל לא נשלח: ${row.subject}`.slice(0, 200),
    html: `<div dir="rtl" style="font:14px/1.6 Arial,sans-serif">
      <p><strong>מייל לא נשלח אחרי ${row.attempts} ניסיונות.</strong></p>
      <p>אל: ${escape(row.to_email)}<br>נושא: ${escape(row.subject)}<br>סוג: ${escape(row.kind)}</p>
      <p>שגיאה אחרונה: ${escape(error.slice(0, 300))}</p>
      <p>ההזמנה או ההודעה עצמה שמורה באתר. כדאי לפנות לנמען בטלפון.</p>
    </div>`,
  }).catch((err) => console.error('[outbox] operator alert failed', err))
}

/**
 * Send what is due: the given rows, or up to RUN_LIMIT of the oldest due rows.
 * Safe to run from several places at once; each row goes to one sender.
 */
export async function processOutbox({ ids, limit = RUN_LIMIT }: { ids?: string[]; limit?: number } = {}): Promise<{ claimed: number; sent: number; failed: number }> {
  const { data, error } = await getSupabaseAdmin().rpc('claim_email_outbox', {
    p_limit: ids ? ids.length : limit,
    ...(ids ? { p_ids: ids } : {}),
  })
  if (error || !data) {
    if (error) console.error('[outbox] claim failed', error)
    return { claimed: 0, sent: 0, failed: 0 }
  }
  let sent = 0
  let failed = 0
  for (const row of data) {
    const status = await sendRow(row)
    if (status === 'sent') sent += 1
    if (status === 'failed') failed += 1
  }
  return { claimed: data.length, sent, failed }
}

let lastKick = 0
/** At most one opportunistic run per minute per server instance. */
const KICK_INTERVAL_MS = 60_000

/**
 * Pick up due retries while people use the site. The scheduled run is the
 * safety net; this is what makes a retry happen minutes, not hours, after it
 * is due. Called from the carpenter app's and the supplier console's frames.
 */
export function kickOutbox(): void {
  const now = Date.now()
  if (now - lastKick < KICK_INTERVAL_MS) return
  lastKick = now
  later(() => processOutbox())
}
