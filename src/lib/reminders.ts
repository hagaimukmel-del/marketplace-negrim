import 'server-only'

import { after } from 'next/server'
import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, sendEmail, siteUrl } from './email'
import { notify } from './notifications'
import { queueEmail } from './outbox'
import { postSystemMessage } from './messages'
import { confirmUrl } from './supplier-link'
import { deletedCarpenterIds } from './carpenter-deletion-server'
import { isWorkingTime, israelWorkday, workingMinutesBetween } from './working-hours'
import { LADDER_MAX_AGE_DAYS, nextRung, rungKey, type Rung } from './reminder-rules'
import { dailySummaryHtml, dailySummarySubject, reminderHtml } from './emails/reminder'

/**
 * The backup ladder and the supplier's morning summary (communication plan,
 * step 5). Rules in reminder-rules.ts, working time in working-hours.ts.
 *
 * Runs from the daily cron, and while people use the site (kickReminders, at
 * most every ten minutes per server). A Hobby plan allows one cron a day, so a
 * quiet site can run a rung late, never early and never twice: each rung is
 * claimed in reminder_log before anything is sent.
 *
 * On a database without reminder_log nothing is claimed, so nothing is sent.
 */

interface Waiting {
  subject: 'order' | 'quote'
  id: string
  supplierId: string
  carpenterId: string | null
  createdAt: string
  label: string
  carpenterName: string
  supplierName: string
  supplierEmail: string | null
}

/** After the response, like the outbox; right away outside a request. */
function later(work: () => Promise<unknown>): void {
  const run = () => work().catch((err) => console.error('[reminders] run failed', err))
  try {
    after(run)
  } catch {
    void run()
  }
}

/** Claim these keys; returns the ones this run got (the rest were already taken). */
async function claim(keys: string[]): Promise<Set<string> | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('reminder_log')
    .upsert(
      keys.map((key) => ({ key })),
      { onConflict: 'key', ignoreDuplicates: true }
    )
    .select('key')
  if (error) {
    console.error('[reminders] claim failed', error)
    return null
  }
  return new Set((data ?? []).map((row) => row.key))
}

async function loadWaiting(): Promise<Waiting[]> {
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - LADDER_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: allOrders }, { data: allQuotes }, deleted] = await Promise.all([
    supabase
      .from('orders')
      .select('id, supplier_id, carpenter_id, created_at, short_number, order_number, business_name, customer_name')
      .eq('status', 'pending')
      .not('supplier_id', 'is', null)
      .gte('created_at', since)
      .limit(500),
    supabase
      .from('quote_requests')
      .select('id, supplier_id, carpenter_id, created_at, products(name_he), carpenters(business_name)')
      .eq('status', 'requested')
      .gte('created_at', since)
      .limit(500),
    deletedCarpenterIds(),
  ])
  // Nobody is chased about a deleted carpentry's order or request.
  const orders = (allOrders ?? []).filter((o) => !o.carpenter_id || !deleted.has(o.carpenter_id))
  const quotes = (allQuotes ?? []).filter((q) => !deleted.has(q.carpenter_id))
  const supplierIds = [...new Set([...(orders ?? []).map((o) => o.supplier_id), ...(quotes ?? []).map((q) => q.supplier_id)].filter(Boolean))] as string[]
  const { data: suppliers } = supplierIds.length
    ? await supabase.from('suppliers').select('id, company_name, email').in('id', supplierIds)
    : { data: [] }
  const supplier = new Map((suppliers ?? []).map((s) => [s.id, s]))

  const waiting: Waiting[] = []
  for (const o of orders ?? []) {
    const s = o.supplier_id ? supplier.get(o.supplier_id) : undefined
    if (!s || !o.created_at) continue
    waiting.push({
      subject: 'order',
      id: o.id,
      supplierId: s.id,
      carpenterId: o.carpenter_id,
      createdAt: o.created_at,
      label: `הזמנה ${o.short_number ? `#${o.short_number}` : o.order_number}`,
      carpenterName: o.business_name || o.customer_name || 'נגרייה',
      supplierName: s.company_name,
      supplierEmail: s.email,
    })
  }
  for (const q of quotes ?? []) {
    const s = supplier.get(q.supplier_id)
    if (!s) continue
    const product = (q.products as { name_he: string | null } | null)?.name_he
    waiting.push({
      subject: 'quote',
      id: q.id,
      supplierId: s.id,
      carpenterId: q.carpenter_id,
      createdAt: q.created_at,
      label: `בקשת הצעת מחיר${product ? ` ל${product}` : ''}`,
      carpenterName: (q.carpenters as { business_name: string | null } | null)?.business_name || 'נגרייה',
      supplierName: s.company_name,
      supplierEmail: s.email,
    })
  }
  return waiting
}

async function remindSupplier(item: Waiting, rung: Rung): Promise<void> {
  const isOrder = item.subject === 'order'
  const title = `${rung === 1 ? 'תזכורת' : 'תזכורת שנייה'}: ${item.label} מ${item.carpenterName} ${isOrder ? 'מחכה לאישור' : 'מחכה לתשובה'}`
  const href = isOrder ? confirmUrl(item.id, item.supplierId, siteUrl()) : `${siteUrl()}/supplier?tab=orders`
  await notify({
    to: { side: 'supplier', id: item.supplierId },
    kind: 'reminder',
    title,
    link: '/supplier?tab=orders',
    orderId: isOrder ? item.id : null,
    quoteRequestId: isOrder ? null : item.id,
    email: item.supplierEmail
      ? {
          to: item.supplierEmail,
          subject: title,
          html: reminderHtml({
            title,
            body: isOrder
              ? 'הנגרייה עדיין מחכה לאישור שההזמנה בטיפול. אישור לוקח רגע, ואפשר לעדכן סכום אם משהו השתנה.'
              : 'הנגרייה עדיין מחכה למחיר. אפשר לענות או לכתוב שאין אפשרות, כדי שתדע להמשיך.',
            href,
            action: isOrder ? 'אשר הזמנה' : 'לתשובה באתר',
          }),
          isTest: isTestName(item.supplierName, item.carpenterName),
          replyTo: process.env.EMAIL_NO_REPLY || null,
        }
      : null,
  })
}

async function tellCarpenter(item: Waiting): Promise<void> {
  if (!item.carpenterId) return
  const isOrder = item.subject === 'order'
  const title = isOrder ? `${item.supplierName} עוד לא אישר את ${item.label}` : `${item.supplierName} עוד לא ענה על ${item.label}`
  await notify({
    to: { side: 'carpenter', id: item.carpenterId },
    kind: 'reminder',
    title,
    body: 'שלחנו לספק תזכורת. אפשר גם להזכיר לו בוואטסאפ או בטלפון.',
    link: isOrder ? `/app/orders/${item.id}` : '/app/quotes',
    orderId: isOrder ? item.id : null,
    quoteRequestId: isOrder ? null : item.id,
  })
  await postSystemMessage(isOrder ? { orderId: item.id } : { quoteRequestId: item.id }, `${title}. נשלחה לספק תזכורת.`)
}

async function tellOperator(items: Waiting[]): Promise<void> {
  const operator = process.env.ADMIN_EMAIL || process.env.EMAIL_REPLY_TO
  if (!operator || items.length === 0) return
  const rows = items
    .map((item) => `<li>${item.label} · ${item.carpenterName} ← ${item.supplierName} · נשלחה ${new Date(item.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</li>`)
    .join('')
  await sendEmail({
    to: operator,
    subject: `${items.length} פריטים מחכים לספק יותר מיומיים`,
    html: `<div dir="rtl" style="font:14px/1.6 Arial,sans-serif">
      <p><strong>ספקים שלא ענו יומיים עבודה, למרות שתי תזכורות.</strong> כדאי להרים טלפון.</p>
      <ul>${rows}</ul>
      <p><a href="${siteUrl()}/admin/orders">להזמנות בממשק הניהול</a></p>
    </div>`,
  }).catch((err) => console.error('[reminders] operator alert failed', err))
}

/** One pass of the ladder. Sends only inside working hours. */
export async function runReminders(now: Date = new Date()): Promise<{ checked: number; acted: number }> {
  if (!isWorkingTime(now)) return { checked: 0, acted: 0 }
  const waiting = await loadWaiting()
  if (waiting.length === 0) return { checked: 0, acted: 0 }

  const supabase = getSupabaseAdmin()
  const allKeys = waiting.flatMap((item) => ([1, 2, 3] as Rung[]).map((rung) => rungKey(item.subject, item.id, rung)))
  const { data: logged, error } = await supabase.from('reminder_log').select('key').in('key', allKeys)
  if (error) return { checked: waiting.length, acted: 0 }
  const done = new Set((logged ?? []).map((row) => row.key))

  const toOperator: Waiting[] = []
  let acted = 0
  for (const item of waiting) {
    const rungsDone = new Set(([1, 2, 3] as Rung[]).filter((rung) => done.has(rungKey(item.subject, item.id, rung))))
    const rung = nextRung(workingMinutesBetween(item.createdAt, now), rungsDone)
    if (!rung) continue
    // Claim this rung and the ones below it; only the run that wins the rung acts.
    const keys = ([1, 2, 3] as Rung[]).filter((r) => r <= rung).map((r) => rungKey(item.subject, item.id, r))
    const claimed = await claim(keys)
    if (!claimed?.has(rungKey(item.subject, item.id, rung))) continue
    acted += 1
    if (rung === 1) await remindSupplier(item, 1)
    if (rung === 2) {
      await remindSupplier(item, 2)
      await tellCarpenter(item)
    }
    if (rung === 3) toOperator.push(item)
  }
  await tellOperator(toOperator)
  return { checked: waiting.length, acted }
}

/**
 * The morning summary: one email per supplier with anything waiting, on
 * working days, once a day. Email only; the bell already lists each item.
 */
export async function sendDailySummaries(now: Date = new Date()): Promise<number> {
  const { date, working } = israelWorkday(now)
  if (!working) return 0
  const supabase = getSupabaseAdmin()
  const [{ data: allOrders }, { data: allQuotes }, { data: allThreads }, deleted] = await Promise.all([
    supabase.from('orders').select('supplier_id, carpenter_id').eq('status', 'pending').not('supplier_id', 'is', null).limit(2000),
    supabase.from('quote_requests').select('supplier_id, carpenter_id').eq('status', 'requested').limit(2000),
    supabase.from('message_threads').select('supplier_id, carpenter_id').eq('last_sender', 'carpenter').eq('status', 'open').limit(2000),
    deletedCarpenterIds(),
  ])
  const visible = <T extends { carpenter_id: string | null }>(rows: T[] | null) =>
    (rows ?? []).filter((row) => !row.carpenter_id || !deleted.has(row.carpenter_id))
  const [orders, quotes, threads] = [visible(allOrders), visible(allQuotes), visible(allThreads)]
  const counts = new Map<string, { orders: number; quotes: number; messages: number }>()
  const bump = (id: string | null, field: 'orders' | 'quotes' | 'messages') => {
    if (!id) return
    const row = counts.get(id) ?? { orders: 0, quotes: 0, messages: 0 }
    row[field] += 1
    counts.set(id, row)
  }
  for (const o of orders ?? []) bump(o.supplier_id, 'orders')
  for (const q of quotes ?? []) bump(q.supplier_id, 'quotes')
  for (const t of threads ?? []) bump(t.supplier_id, 'messages')
  if (counts.size === 0) return 0

  const { data: suppliers } = await supabase.from('suppliers').select('id, company_name, email').in('id', [...counts.keys()])
  const withEmail = (suppliers ?? []).filter((s) => s.email)
  const claimed = await claim(withEmail.map((s) => `daily:${s.id}:${date}`))
  if (!claimed) return 0
  let sent = 0
  for (const s of withEmail) {
    if (!claimed.has(`daily:${s.id}:${date}`)) continue
    const summary = { supplierName: s.company_name, ...counts.get(s.id)! }
    if (
      await queueEmail({
        kind: 'daily_summary',
        to: s.email!,
        subject: dailySummarySubject(summary),
        html: dailySummaryHtml(summary),
        isTest: isTestName(s.company_name),
      })
    )
      sent += 1
  }
  return sent
}

const KICK_INTERVAL_MS = 10 * 60 * 1000
let lastKick = 0

/** Climb the ladder while people use the site; at most every ten minutes per server. */
export function kickReminders(): void {
  const now = Date.now()
  if (now - lastKick < KICK_INTERVAL_MS) return
  lastKick = now
  later(() => runReminders())
}
