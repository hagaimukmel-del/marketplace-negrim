import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { nationalPhone, isMobilePhone } from './phone'
import { workingMinutesBetween } from './working-hours'
import { rungDue } from './reminder-rules'

/**
 * What the operator sees on "בריאות תקשורת" (communication plan, step 6):
 * whether the site's mail goes out and arrives, what is stuck waiting on a
 * supplier, and who cannot be reached at all. Reads only; the actions (resend,
 * unblock an address) are in /api/admin/communication.
 *
 * Every part reads its own table, so a database without one of the
 * communication migrations shows that part as not available, not the page as
 * broken.
 */

export interface MailRow {
  id: string
  kind: string
  to: string
  subject: string
  status: string
  attempts: number
  lastError: string | null
  createdAt: string
  suppressed: boolean
}

export interface WaitingRow {
  subject: 'order' | 'quote'
  id: string
  label: string
  carpenter: string
  supplier: string
  createdAt: string
  workingHours: number
  rung: number
  contacted: number
}

export interface UnreachableRow {
  side: 'supplier' | 'carpenter'
  id: string
  name: string
  problems: string[]
}

export interface CommunicationHealth {
  ready: boolean
  week: { queued: number; sent: number; delivered: number; failed: number; pending: number }
  problems: MailRow[]
  suppressions: { email: string; reason: string; createdAt: string }[]
  waiting: WaitingRow[]
  unanswered: { id: string; subject: string; carpenter: string; supplier: string; lastMessageAt: string }[]
  unreachable: UnreachableRow[]
}

export async function loadCommunicationHealth(now: Date = new Date()): Promise<CommunicationHealth> {
  const supabase = getSupabaseAdmin()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [week, problems, suppressions, orders, quotes, threads, suppliers, carpenters, clicks] = await Promise.all([
    supabase.from('email_outbox').select('status').gte('created_at', weekAgo).limit(5000),
    supabase
      .from('email_outbox')
      .select('id, kind, to_email, subject, status, attempts, last_error, created_at')
      .or('status.in.(failed,bounced),and(status.eq.pending,attempts.gt.0)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('email_suppressions').select('email, reason, created_at').order('created_at', { ascending: false }).limit(100),
    supabase
      .from('orders')
      .select('id, created_at, short_number, order_number, business_name, customer_name, suppliers(company_name)')
      .eq('status', 'pending')
      .order('created_at')
      .limit(100),
    supabase
      .from('quote_requests')
      .select('id, created_at, products(name_he), carpenters(business_name), suppliers(company_name)')
      .eq('status', 'requested')
      .order('created_at')
      .limit(100),
    supabase
      .from('message_threads')
      .select('id, subject, last_message_at, carpenters(business_name), suppliers(company_name)')
      .eq('last_sender', 'carpenter')
      .eq('status', 'open')
      .order('last_message_at')
      .limit(50),
    supabase.from('suppliers').select('id, company_name, email, phone').eq('status', 'approved').limit(500),
    supabase.from('carpenters').select('id, business_name, email, email_verified_at, phone').eq('is_active', true).limit(2000),
    supabase.from('contact_clicks').select('order_id').gte('created_at', weekAgo).limit(5000),
  ])

  const ready = !week.error
  const counts = { queued: 0, sent: 0, delivered: 0, failed: 0, pending: 0 }
  for (const row of week.data ?? []) {
    counts.queued += 1
    if (row.status === 'sent') counts.sent += 1
    if (row.status === 'delivered') counts.delivered += 1
    if (row.status === 'failed' || row.status === 'bounced') counts.failed += 1
    if (row.status === 'pending' || row.status === 'sending') counts.pending += 1
  }

  const blocked = new Set((suppressions.data ?? []).map((row) => row.email))
  const contactedByOrder = new Map<string, number>()
  for (const row of clicks.data ?? []) if (row.order_id) contactedByOrder.set(row.order_id, (contactedByOrder.get(row.order_id) ?? 0) + 1)

  const age = (createdAt: string) => {
    const minutes = workingMinutesBetween(createdAt, now)
    return { workingHours: Math.round((minutes / 60) * 10) / 10, rung: rungDue(minutes) ?? 0 }
  }
  const name = (embed: unknown, field: 'company_name' | 'business_name' | 'name_he') =>
    ((embed as Record<string, string | null> | null)?.[field] ?? null) as string | null

  const waiting: WaitingRow[] = [
    ...(orders.data ?? []).filter((o) => o.created_at).map((o) => ({
      subject: 'order' as const,
      id: o.id,
      label: `הזמנה ${o.short_number ? `#${o.short_number}` : o.order_number}`,
      carpenter: o.business_name || o.customer_name || 'נגרייה',
      supplier: name(o.suppliers, 'company_name') ?? '—',
      createdAt: o.created_at as string,
      contacted: contactedByOrder.get(o.id) ?? 0,
      ...age(o.created_at as string),
    })),
    ...(quotes.data ?? []).map((q) => ({
      subject: 'quote' as const,
      id: q.id,
      label: `הצעת מחיר${name(q.products, 'name_he') ? ` ל${name(q.products, 'name_he')}` : ''}`,
      carpenter: name(q.carpenters, 'business_name') ?? 'נגרייה',
      supplier: name(q.suppliers, 'company_name') ?? '—',
      createdAt: q.created_at,
      contacted: 0,
      ...age(q.created_at),
    })),
  ].sort((a, b) => b.workingHours - a.workingHours)

  const unreachable: UnreachableRow[] = []
  for (const s of suppliers.data ?? []) {
    const problems: string[] = []
    if (!s.email) problems.push('אין מייל')
    else if (blocked.has(s.email.toLowerCase())) problems.push('המייל חוזר')
    if (!nationalPhone(s.phone)) problems.push('אין טלפון תקין')
    else if (!isMobilePhone(s.phone)) problems.push('אין נייד לוואטסאפ')
    if (problems.length) unreachable.push({ side: 'supplier', id: s.id, name: s.company_name, problems })
  }
  for (const c of carpenters.data ?? []) {
    const problems: string[] = []
    if (!c.email) problems.push('אין מייל')
    else if (blocked.has(c.email.toLowerCase())) problems.push('המייל חוזר')
    else if (!c.email_verified_at) problems.push('המייל לא אומת')
    if (problems.length) unreachable.push({ side: 'carpenter', id: c.id, name: c.business_name, problems })
  }

  return {
    ready,
    week: counts,
    problems: (problems.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      to: row.to_email,
      subject: row.subject,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      suppressed: blocked.has(row.to_email.toLowerCase()),
    })),
    suppressions: (suppressions.data ?? []).map((row) => ({ email: row.email, reason: row.reason, createdAt: row.created_at })),
    waiting,
    unanswered: (threads.data ?? []).map((t) => ({
      id: t.id,
      subject: t.subject,
      carpenter: name(t.carpenters, 'business_name') ?? 'נגרייה',
      supplier: name(t.suppliers, 'company_name') ?? '—',
      lastMessageAt: t.last_message_at,
    })),
    unreachable,
  }
}

/** Failed or bounced mail in the last week, for the count beside the tab. Zero without the table. */
export async function communicationProblemCount(): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await getSupabaseAdmin()
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .in('status', ['failed', 'bounced'])
    .gte('created_at', weekAgo)
  return error ? 0 : (count ?? 0)
}
