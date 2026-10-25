import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { sendEmail } from './email'
import type { DeliveryUpdate } from './resend-webhook'
import type { Database } from './database.types'

type OutboxRow = Database['public']['Tables']['email_outbox']['Row']

/**
 * What happens when an email does not arrive (communication plan, step 2).
 *
 * Three people need to know, each in their own way:
 * - the side that caused the mail (the carpentry whose order it was, the
 *   supplier whose answer it was) gets a line under its bell: "the email to X
 *   did not arrive; it is saved in the site, call or WhatsApp them";
 * - the owner of the address sees a banner in the site asking to fix it
 *   (emailProblemFor, read by the app frame and the supplier console);
 * - the operator gets one email.
 *
 * This file writes the notification directly rather than through notify(), so
 * the outbox can use it without importing itself in a circle, and so a notice
 * about a failed email never queues an email of its own.
 */

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** One email to the operator about a mail that will not arrive. Sent directly, never queued. */
export async function tellOperator(row: Pick<OutboxRow, 'to_email' | 'subject' | 'kind' | 'attempts'>, error: string): Promise<void> {
  const operator = process.env.ADMIN_EMAIL || process.env.EMAIL_REPLY_TO
  if (!operator) return
  await sendEmail({
    to: operator,
    subject: `מייל לא הגיע: ${row.subject}`.slice(0, 200),
    html: `<div dir="rtl" style="font:14px/1.6 Arial,sans-serif">
      <p><strong>מייל לא הגיע ליעדו${row.attempts > 1 ? ` (אחרי ${row.attempts} ניסיונות)` : ''}.</strong></p>
      <p>אל: ${escapeHtml(row.to_email)}<br>נושא: ${escapeHtml(row.subject)}<br>סוג: ${escapeHtml(row.kind)}</p>
      <p>סיבה: ${escapeHtml(error.slice(0, 300))}</p>
      <p>ההזמנה או ההודעה עצמה שמורה באתר. כדאי לפנות לנמען בטלפון.</p>
    </div>`,
  }).catch((err) => console.error('[delivery] operator alert failed', err))
}

/**
 * Tell the side that caused this mail that it did not arrive. Only mails tied
 * to a notification about an order, a quote or a thread have such a side; a
 * copy to a bookkeeper or a carpentry's own receipt does not.
 */
export async function reportUndelivered(row: Pick<OutboxRow, 'notification_id'>): Promise<void> {
  if (!row.notification_id) return
  try {
    const supabase = getSupabaseAdmin()
    const { data: notification } = await supabase
      .from('notifications')
      .select('recipient_side, carpenter_id, supplier_id, title, order_id, quote_request_id, thread_id')
      .eq('id', row.notification_id)
      .maybeSingle()
    if (!notification) return

    // Whoever is on the other side of the order, quote or thread.
    let pair: { carpenter_id: string | null; supplier_id: string | null } | null = null
    if (notification.order_id) {
      const { data } = await supabase.from('orders').select('carpenter_id, supplier_id').eq('id', notification.order_id).maybeSingle()
      pair = data
    } else if (notification.quote_request_id) {
      const { data } = await supabase.from('quote_requests').select('carpenter_id, supplier_id').eq('id', notification.quote_request_id).maybeSingle()
      pair = data
    } else if (notification.thread_id) {
      const { data } = await supabase.from('message_threads').select('carpenter_id, supplier_id').eq('id', notification.thread_id).maybeSingle()
      pair = data
    }
    if (!pair?.carpenter_id || !pair.supplier_id) return

    const toSupplierFailed = notification.recipient_side === 'supplier'
    const senderSide = toSupplierFailed ? 'carpenter' : 'supplier'
    const name = toSupplierFailed
      ? (await supabase.from('suppliers').select('company_name').eq('id', pair.supplier_id).maybeSingle()).data?.company_name
      : (await supabase.from('carpenters').select('business_name').eq('id', pair.carpenter_id).maybeSingle()).data?.business_name

    const link =
      senderSide === 'carpenter'
        ? notification.order_id
          ? `/app/orders/${notification.order_id}`
          : notification.thread_id
            ? `/app/messages/${notification.thread_id}`
            : '/app/quotes'
        : notification.thread_id
          ? `/supplier/messages/${notification.thread_id}`
          : '/supplier?tab=orders'

    await supabase.from('notifications').insert({
      recipient_side: senderSide,
      carpenter_id: senderSide === 'carpenter' ? pair.carpenter_id : null,
      supplier_id: senderSide === 'supplier' ? pair.supplier_id : null,
      kind: 'email_failed',
      title: `המייל ל${name ?? (toSupplierFailed ? 'ספק' : 'נגרייה')} לא הגיע`.slice(0, 200),
      body: `${notification.title}. זה שמור באתר ומחכה להם בפעמון. כדאי גם להתקשר או לשלוח וואטסאפ.`.slice(0, 400),
      link,
      order_id: notification.order_id,
      quote_request_id: notification.quote_request_id,
      thread_id: notification.thread_id,
    })
  } catch (err) {
    console.error('[delivery] report undelivered failed', err)
  }
}

/** Addresses among these that must not be mailed. Empty on a database without the table. */
export async function suppressedAmong(emails: string[]): Promise<Set<string>> {
  const wanted = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))]
  if (wanted.length === 0) return new Set()
  const { data, error } = await getSupabaseAdmin().from('email_suppressions').select('email').in('email', wanted)
  if (error) return new Set()
  return new Set((data ?? []).map((row) => row.email))
}

export interface EmailProblem {
  email: string
  reason: 'bounced' | 'complained'
}

/** Whether this address is one we stopped mailing, for the banner asking its owner to fix it. */
export async function emailProblemFor(email: string | null | undefined): Promise<EmailProblem | null> {
  if (!email) return null
  const { data, error } = await getSupabaseAdmin()
    .from('email_suppressions')
    .select('email, reason')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (error || !data) return null
  return { email: data.email, reason: data.reason === 'complained' ? 'complained' : 'bounced' }
}

/**
 * Apply one report from Resend. A mail that bounced or failed, and was not
 * already known as such, is reported to its sender and to the operator, once.
 */
export async function applyDeliveryUpdate(update: DeliveryUpdate): Promise<{ matched: boolean }> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  for (const entry of update.suppress) {
    await supabase
      .from('email_suppressions')
      .upsert({ email: entry.email, reason: entry.reason, detail: update.detail, updated_at: now }, { onConflict: 'email' })
  }

  const { data: row } = await supabase
    .from('email_outbox')
    .select('id, status, notification_id, to_email, subject, kind, attempts')
    .eq('provider_id', update.providerId)
    .maybeSingle()
  if (!row) return { matched: false }

  const problem = update.status === 'bounced' || update.status === 'failed'
  const alreadyKnown = row.status === 'bounced' || row.status === 'failed'
  // "Delivered" never overwrites a bounce or a failure that arrived first.
  if (!problem && alreadyKnown) return { matched: true }

  await supabase
    .from('email_outbox')
    .update({
      status: update.status,
      delivery_updated_at: now,
      ...(update.detail ? { last_error: update.detail } : {}),
    })
    .eq('id', row.id)

  if (problem && !alreadyKnown) {
    await reportUndelivered(row)
    await tellOperator(row, update.detail ?? (update.status === 'bounced' ? 'המייל חזר' : 'השליחה נכשלה'))
  }
  return { matched: true }
}

/** The banner check for a signed-in carpentry, whose session does not carry its email. */
export async function carpenterEmailProblem(carpenterId: string): Promise<EmailProblem | null> {
  const { data } = await getSupabaseAdmin().from('carpenters').select('email').eq('id', carpenterId).maybeSingle()
  return emailProblemFor(data?.email)
}
