import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName, sendEmail, siteUrl } from '@/lib/email'
import { regionName } from '@/lib/regions'
import { jobTypeName, subscriptionGrants } from '@/lib/work'
import { jobLabel } from '@/lib/work-chat'
import { workBoardOpen } from '@/lib/work-server'
import {
  fitsJob,
  kindForMessage,
  mayEmail,
  notifyForMessage,
  underCap,
  unsubscribeSignature,
  type NotifyKind,
  type NotifyRecipient,
} from '@/lib/work-notify'
import { answerHtml, answerSubject, jobMatchHtml, jobMatchSubject, messageHtml, messageSubject } from '@/lib/emails/work'

/**
 * נגרים עובדים ביחד, phase 3: sending the emails.
 *
 * Called from route handlers inside after(), so a slow mail provider never
 * holds up posting a job or sending a message, and a failure here never fails
 * the action that caused it. Nothing is sent while the board is closed to
 * carpenters: the emails would link to a page they cannot open.
 */

/** Matching profiles read for one job. Far above a region's carpentries for a long time. */
const MATCH_LIMIT = 500

interface CarpenterJoin {
  business_name: string
  email: string | null
  email_verified_at: string | null
  is_active: boolean
}

function secret(): string | null {
  const value = process.env.ADMIN_SECRET
  return value && value.length >= 16 ? value : null
}

function unsubscribeLink(carpenterId: string, key: string): string {
  return `${siteUrl()}/api/work/unsubscribe?c=${carpenterId}&t=${unsubscribeSignature(carpenterId, key)}`
}

function dateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return year && month && day ? `${day}.${month}` : isoDate
}

async function sentToday(carpenterId: string): Promise<number> {
  const { count } = await getSupabaseAdmin()
    .from('work_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('carpenter_id', carpenterId)
    .eq('status', 'sent')
    .gt('created_at', new Date(Date.now() - 86_400_000).toISOString())
  return count ?? 0
}

/** One email, after the consent, verification and daily-cap checks, and its line in the log. */
async function deliver(
  carpenterId: string,
  recipient: NotifyRecipient & { business_name: string },
  kind: NotifyKind,
  refs: { job_id?: string; conversation_id?: string },
  build: (unsubscribe: string) => { subject: string; html: string }
): Promise<void> {
  const key = secret()
  if (!key || !mayEmail(recipient)) return
  const supabase = getSupabaseAdmin()
  if (!underCap(await sentToday(carpenterId))) {
    await supabase.from('work_notifications').insert({ carpenter_id: carpenterId, kind, ...refs, status: 'capped' })
    return
  }
  const { subject, html } = build(unsubscribeLink(carpenterId, key))
  const result = await sendEmail({ to: recipient.email, subject, html, isTest: isTestName(recipient.business_name) })
  await supabase
    .from('work_notifications')
    .insert({ carpenter_id: carpenterId, kind, ...refs, status: result.sent ? 'sent' : 'failed' })
}

/** A new job: every member whose profile fits it, except the carpentry that posted it. */
export async function notifyJobPosted(jobId: string, now: Date = new Date()): Promise<void> {
  if (!workBoardOpen()) return
  const supabase = getSupabaseAdmin()
  const { data: job } = await supabase
    .from('work_jobs')
    .select('id, carpenter_id, job_type, region, quantity, due_date, description, status')
    .eq('id', jobId)
    .maybeSingle()
  if (!job || job.status !== 'open') return

  const { data: profiles, error } = await supabase
    .from('work_profiles')
    .select('carpenter_id, job_types, regions, notify_email, carpenters!inner(business_name, email, email_verified_at, is_active)')
    .eq('notify_email', true)
    .contains('job_types', [job.job_type])
    .contains('regions', [job.region])
    .neq('carpenter_id', job.carpenter_id)
    .limit(MATCH_LIMIT)
  if (error || !profiles?.length) return

  const { data: subscriptions } = await supabase
    .from('work_subscriptions')
    .select('carpenter_id, status, ends_at')
    .in('carpenter_id', profiles.map((profile) => profile.carpenter_id))
  const members = new Set((subscriptions ?? []).filter((row) => subscriptionGrants(row, now)).map((row) => row.carpenter_id))

  const summary = {
    id: job.id,
    typeName: jobTypeName(job.job_type),
    regionName: regionName(job.region),
    quantity: job.quantity,
    dueDate: dateLabel(job.due_date),
    description: job.description,
  }
  for (const profile of profiles) {
    if (!members.has(profile.carpenter_id) || !fitsJob(profile, job)) continue
    const carpenter = profile.carpenters as unknown as CarpenterJoin
    await deliver(profile.carpenter_id, { ...carpenter, notify_email: profile.notify_email }, 'job_match', { job_id: job.id }, (unsubscribe) => ({
      subject: jobMatchSubject(summary),
      html: jobMatchHtml(summary, unsubscribe),
    }))
  }
}

/**
 * A message in a conversation: the other side hears of it. The applicant's
 * first message is an answer to the job; after that, one email per run of
 * unread messages.
 */
export async function notifyConversation(conversationId: string, sender: 'poster' | 'applicant'): Promise<void> {
  if (!workBoardOpen()) return
  const supabase = getSupabaseAdmin()
  const { data: row } = await supabase
    .from('work_conversations')
    .select(
      'id, poster_id, applicant_id, poster_last_read_at, applicant_last_read_at, blocked_by, work_jobs(job_type, quantity), ' +
        'poster:carpenters!work_conversations_poster_id_fkey(business_name, email, email_verified_at, is_active), ' +
        'applicant:carpenters!work_conversations_applicant_id_fkey(business_name, email, email_verified_at, is_active)'
    )
    .eq('id', conversationId)
    .maybeSingle()
  const conversation = row as unknown as {
    id: string
    poster_id: string
    applicant_id: string
    poster_last_read_at: string | null
    applicant_last_read_at: string | null
    blocked_by: string | null
    work_jobs: { job_type: string; quantity: string } | null
    poster: CarpenterJoin | null
    applicant: CarpenterJoin | null
  } | null
  if (!conversation || conversation.blocked_by) return

  const toPoster = sender === 'applicant'
  const recipientId = toPoster ? conversation.poster_id : conversation.applicant_id
  const recipient = toPoster ? conversation.poster : conversation.applicant
  const from = (toPoster ? conversation.applicant : conversation.poster)?.business_name ?? 'נגרייה'
  if (!recipient) return

  const [{ data: profile }, { data: messages, count }, { data: last }] = await Promise.all([
    supabase.from('work_profiles').select('notify_email').eq('carpenter_id', recipientId).maybeSingle(),
    supabase
      .from('work_messages')
      .select('body', { count: 'exact' })
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('work_notifications')
      .select('created_at')
      .eq('conversation_id', conversation.id)
      .eq('carpenter_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const kind = kindForMessage(sender, count ?? 0)
  const readAt = toPoster ? conversation.poster_last_read_at : conversation.applicant_last_read_at
  if (kind === 'message' && !notifyForMessage(last?.created_at ?? null, readAt)) return

  const subject = conversation.work_jobs
    ? jobLabel(jobTypeName(conversation.work_jobs.job_type), conversation.work_jobs.quantity)
    : 'עבודה'
  const content = { from, subject, body: messages?.[0]?.body ?? '', conversationId: conversation.id }
  await deliver(
    recipientId,
    { ...recipient, notify_email: profile?.notify_email ?? false },
    kind,
    { conversation_id: conversation.id },
    (unsubscribe) =>
      kind === 'answer'
        ? { subject: answerSubject(subject), html: answerHtml(content, unsubscribe) }
        : { subject: messageSubject(from), html: messageHtml(content, unsubscribe) }
  )
}
