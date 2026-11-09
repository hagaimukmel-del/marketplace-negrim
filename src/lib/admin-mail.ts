import 'server-only'

import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from './supabase-admin'
import { isTestName } from './email'
import { queueEmail, queueEmails, sendQueuedPaced, type QueuedEmail } from './outbox'
import { logAdminAction } from './admin-scope'
import { loadPromoRecipients, unsubscribeUrl } from './promo-carpenters'
import { PROMO_SEND_PACE_MS } from './promo-carpenters-rules'
import {
  ADMIN_MAIL_REPLY_TO,
  broadcastKey,
  isMarketingMailing,
  mailSubject,
  maySupplierBroadcast,
  type MailAudience,
  type MailDraft,
  type MailSide,
} from './admin-mail-rules'
import { adminMessageHtml } from './emails/admin-message'

/**
 * Hand-written mail from /admin (owner, 2026-11-09): one message to one
 * supplier or carpentry, or one message to all approved suppliers or to all
 * carpentries that agreed to offers by mail. The rules are in
 * lib/admin-mail-rules.ts.
 *
 * Every mail goes through the outbox (retries, bounced addresses skipped,
 * shown on /admin/communication) and every send is written to admin_actions.
 */

/** How long one request keeps sending a mailing before leaving the rest to the outbox. */
const SEND_WINDOW_MS = 240_000

const SUPPLIER_LIMIT = 2000

export type SendOneResult = { ok: true; to: string } | { ok: false; error: string; status: number }

/** One message to one supplier or carpentry. */
export async function sendAdminMailToOne(side: MailSide, id: string, draft: MailDraft): Promise<SendOneResult> {
  const supabase = getSupabaseAdmin()
  let to: string | null = null
  let name = ''
  let greeting: string | null = null
  if (side === 'supplier') {
    const { data } = await supabase.from('suppliers').select('id, company_name, contact_name, email').eq('id', id).maybeSingle()
    if (!data) return { ok: false, error: 'הספק לא נמצא', status: 404 }
    to = data.email
    name = data.company_name
    greeting = data.contact_name || data.company_name
  } else {
    const { data } = await supabase.from('carpenters').select('id, business_name, contact_name, email, deleted_at').eq('id', id).maybeSingle()
    if (!data || data.deleted_at) return { ok: false, error: 'הנגרייה לא נמצאה', status: 404 }
    to = data.email
    name = data.business_name
    greeting = data.contact_name || data.business_name
  }
  if (!to || !to.includes('@')) return { ok: false, error: 'אין כתובת מייל רשומה', status: 400 }

  const queued = await queueEmail({
    kind: 'admin_message',
    to,
    subject: draft.subject,
    html: adminMessageHtml({ greetingName: greeting, body: draft.body, replyTo: ADMIN_MAIL_REPLY_TO }),
    replyTo: ADMIN_MAIL_REPLY_TO,
    isTest: isTestName(name),
  })
  if (!queued) return { ok: false, error: 'המייל לא נכנס לתור השליחה', status: 500 }

  await logAdminAction({
    action: 'email_sent',
    supplierId: side === 'supplier' ? id : null,
    targetId: side === 'carpenter' ? id : null,
    details: { side, to, subject: draft.subject },
  })
  return { ok: true, to }
}

interface Recipient {
  id: string
  name: string
  email: string
  greeting: string | null
}

async function loadSuppliers(): Promise<Recipient[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('suppliers')
    .select('id, company_name, contact_name, email, status')
    .eq('status', 'approved')
    .not('email', 'is', null)
    .limit(SUPPLIER_LIMIT)
  if (error) {
    console.error('[admin-mail] suppliers', error)
    return []
  }
  return (data ?? [])
    .filter(maySupplierBroadcast)
    .map((row) => ({ id: row.id, name: row.company_name, email: row.email, greeting: row.contact_name || row.company_name }))
}

async function loadCarpenters(): Promise<Recipient[]> {
  // The same list "מוצר השבוע" goes to: agreed to offers, active, address verified.
  const rows = await loadPromoRecipients()
  return rows.map((row) => ({ id: row.id, name: row.business_name, email: row.email, greeting: null }))
}

/** Who a mailing to this audience reaches now. */
export async function loadAudience(audience: MailAudience): Promise<Recipient[]> {
  return audience === 'suppliers' ? loadSuppliers() : loadCarpenters()
}

export type BroadcastResult =
  | { ok: true; queued: number; sent: number }
  | { ok: false; error: string; status: number }

/** One message to every approved supplier, or to every carpentry that agreed to offers. */
export async function sendAdminMailing(audience: MailAudience, draft: MailDraft, markedMarketing: boolean, now = new Date()): Promise<BroadcastResult> {
  const marketing = isMarketingMailing(audience, markedMarketing)
  const secret = process.env.ADMIN_SECRET
  if (audience === 'carpenters' && (!secret || secret.length < 16)) {
    return { ok: false, error: 'ADMIN_SECRET חסר, אי אפשר לבנות קישור הסרה', status: 500 }
  }
  const recipients = await loadAudience(audience)
  if (recipients.length === 0) return { ok: false, error: 'אין נמענים', status: 400 }

  const key = broadcastKey(audience, draft, now, (text) => createHash('sha256').update(text).digest('hex').slice(0, 16))
  const supabase = getSupabaseAdmin()
  const { data: claimed, error } = await supabase
    .from('reminder_log')
    .upsert([{ key }], { onConflict: 'key', ignoreDuplicates: true })
    .select('key')
  if (error) {
    console.error('[admin-mail] claim failed', error)
    return { ok: false, error: 'לא הצלחתי לרשום את ההפצה. נסה שוב.', status: 500 }
  }
  if (!claimed || claimed.length === 0) return { ok: false, error: 'ההודעה הזאת כבר נשלחה היום לאותה רשימה', status: 409 }

  const subject = mailSubject(draft.subject, marketing)
  const emails: QueuedEmail[] = recipients.map((recipient) => ({
    kind: audience === 'suppliers' ? 'admin_mailing_suppliers' : 'admin_mailing_carpenters',
    to: recipient.email,
    subject,
    html: adminMessageHtml({
      greetingName: recipient.greeting,
      body: draft.body,
      replyTo: ADMIN_MAIL_REPLY_TO,
      marketing: marketing
        ? { unsubscribeUrl: audience === 'carpenters' && secret ? unsubscribeUrl(recipient.id, secret) : null }
        : null,
    }),
    replyTo: ADMIN_MAIL_REPLY_TO,
    isTest: isTestName(recipient.name),
  }))

  let queued = 0
  try {
    queued = await queueEmails(emails, { sendNow: false })
  } catch (err) {
    console.error('[admin-mail] queue failed', err)
    await supabase.from('reminder_log').delete().eq('key', key)
    return { ok: false, error: 'השליחה נכשלה', status: 500 }
  }

  await logAdminAction({
    action: 'email_mailing',
    targetId: audience,
    details: { audience, subject, marketing, recipients: recipients.length, queued },
  })

  const sent = await sendQueuedPaced(SEND_WINDOW_MS, PROMO_SEND_PACE_MS)
  return { ok: true, queued, sent }
}
