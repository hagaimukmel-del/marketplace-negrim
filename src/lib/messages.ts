import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName, sendEmail } from '@/lib/email'
import { newMessageHtml, newMessageSubject } from '@/lib/emails/new-message'

/**
 * Threads and messages between a carpentry and a supplier (T-025).
 *
 * Every function takes the party asking — a carpentry or a supplier, resolved
 * from its own session by the caller — and only ever touches threads that
 * party is on. Tables come from migration 20261008150000; on a database
 * without it the reads return nothing and the bell stays hidden.
 */

export type Side = 'carpenter' | 'supplier'

export interface Party {
  side: Side
  id: string
}

export interface ThreadSummary {
  id: string
  subject: string
  /** The other side's business name. */
  counterpart: string
  orderLabel: string | null
  status: 'open' | 'handled'
  lastMessageAt: string
  unread: boolean
}

export interface ThreadMessage {
  id: string
  mine: boolean
  body: string
  createdAt: string
}

export interface ThreadDetail extends ThreadSummary {
  orderId: string | null
  productId: string | null
  messages: ThreadMessage[]
}

const MAX_BODY = 2000

interface ThreadRow {
  id: string
  subject: string
  status: string
  last_message_at: string
  last_sender: string
  carpenter_last_read_at: string | null
  supplier_last_read_at: string | null
  order_id: string | null
  product_id: string | null
  carpenter_id: string
  supplier_id: string
  carpenters: { business_name: string } | null
  suppliers: { company_name: string } | null
  orders: { short_number: number | null; order_number: string } | null
}

const THREAD_COLUMNS =
  'id, subject, status, last_message_at, last_sender, carpenter_last_read_at, supplier_last_read_at, order_id, product_id, carpenter_id, supplier_id, ' +
  'carpenters(business_name), suppliers(company_name), orders(short_number, order_number)'

const ownColumn = (side: Side) => (side === 'carpenter' ? 'carpenter_id' : 'supplier_id')

function isUnread(row: Pick<ThreadRow, 'last_sender' | 'last_message_at' | 'carpenter_last_read_at' | 'supplier_last_read_at'>, side: Side): boolean {
  if (row.last_sender === side) return false
  const readAt = side === 'carpenter' ? row.carpenter_last_read_at : row.supplier_last_read_at
  return !readAt || new Date(row.last_message_at) > new Date(readAt)
}

function summary(row: ThreadRow, side: Side): ThreadSummary {
  return {
    id: row.id,
    subject: row.subject,
    counterpart: (side === 'carpenter' ? row.suppliers?.company_name : row.carpenters?.business_name) ?? '',
    orderLabel: row.orders ? (row.orders.short_number ? `#${row.orders.short_number}` : row.orders.order_number) : null,
    status: row.status === 'handled' ? 'handled' : 'open',
    lastMessageAt: row.last_message_at,
    unread: isUnread(row, side),
  }
}

/** Threads waiting for this party. Zero on a database without the tables. */
export async function unreadCount(party: Party): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from('message_threads')
    .select('last_sender, last_message_at, carpenter_last_read_at, supplier_last_read_at')
    .eq(ownColumn(party.side), party.id)
    .neq('last_sender', party.side)
    .limit(500)
  if (error) return 0
  return (data ?? []).filter((row) => isUnread(row, party.side)).length
}

export async function listThreads(party: Party): Promise<{ ready: boolean; threads: ThreadSummary[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from('message_threads')
    .select(THREAD_COLUMNS)
    .eq(ownColumn(party.side), party.id)
    .order('last_message_at', { ascending: false })
    .limit(200)
  if (error) return { ready: false, threads: [] }
  return { ready: true, threads: ((data ?? []) as unknown as ThreadRow[]).map((row) => summary(row, party.side)) }
}

async function ownThread(party: Party, threadId: string): Promise<ThreadRow | null> {
  const { data } = await getSupabaseAdmin()
    .from('message_threads')
    .select(THREAD_COLUMNS)
    .eq('id', threadId)
    .eq(ownColumn(party.side), party.id)
    .maybeSingle()
  return (data as unknown as ThreadRow | null) ?? null
}

/** One thread with its messages; opening it marks it read for this party. */
export async function loadThread(party: Party, threadId: string): Promise<ThreadDetail | null> {
  const row = await ownThread(party, threadId)
  if (!row) return null
  const supabase = getSupabaseAdmin()
  const [{ data: rows }] = await Promise.all([
    supabase.from('messages').select('id, sender, body, created_at').eq('thread_id', row.id).order('created_at').limit(500),
    supabase
      .from('message_threads')
      .update(party.side === 'carpenter' ? { carpenter_last_read_at: new Date().toISOString() } : { supplier_last_read_at: new Date().toISOString() })
      .eq('id', row.id),
  ])
  return {
    ...summary(row, party.side),
    unread: false,
    orderId: row.order_id,
    productId: row.product_id,
    messages: (rows ?? []).map((m) => ({ id: m.id, mine: m.sender === party.side, body: m.body, createdAt: m.created_at })),
  }
}

function cleanBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const body = raw.trim().slice(0, MAX_BODY)
  return body.length > 0 ? body : null
}

/** Email the other side; best-effort, a failed mail never fails the message. */
async function notifyOtherSide(row: ThreadRow, from: Side, body: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const [{ data: carpenter }, { data: supplier }] = await Promise.all([
      supabase.from('carpenters').select('business_name, email, email_verified_at').eq('id', row.carpenter_id).maybeSingle(),
      supabase.from('suppliers').select('company_name, email').eq('id', row.supplier_id).maybeSingle(),
    ])
    // A carpentry is mailed only at an address it has proved, like every other carpenter mail
    const to = from === 'carpenter' ? supplier?.email : carpenter?.email_verified_at ? carpenter.email : null
    if (!to) return
    const fromName = (from === 'carpenter' ? carpenter?.business_name : supplier?.company_name) ?? 'שוק הנגרים'
    await sendEmail({
      to,
      subject: newMessageSubject(fromName, row.subject),
      html: newMessageHtml({
        fromName,
        subject: row.subject,
        body,
        path: from === 'carpenter' ? `/supplier/messages/${row.id}` : `/app/messages/${row.id}`,
      }),
      isTest: isTestName(carpenter?.business_name, supplier?.company_name),
    })
  } catch (err) {
    console.error('[messages] notify failed', err)
  }
}

async function append(row: ThreadRow, from: Side, body: string, notify = true): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase.from('messages').insert({ thread_id: row.id, sender: from, body })
  if (error) {
    console.error('[messages] insert failed', error)
    return false
  }
  await supabase
    .from('message_threads')
    .update({
      last_message_at: now,
      last_sender: from,
      status: 'open',
      ...(from === 'carpenter' ? { carpenter_last_read_at: now } : { supplier_last_read_at: now }),
    })
    .eq('id', row.id)
  if (notify) await notifyOtherSide(row, from, body)
  return true
}

export type PostResult = { ok: true; threadId: string } | { ok: false; status: number; error: string }

export async function reply(party: Party, threadId: string, rawBody: unknown): Promise<PostResult> {
  const body = cleanBody(rawBody)
  if (!body) return { ok: false, status: 400, error: 'ההודעה ריקה' }
  const row = await ownThread(party, threadId)
  if (!row) return { ok: false, status: 404, error: 'השיחה לא נמצאה' }
  return (await append(row, party.side, body)) ? { ok: true, threadId: row.id } : { ok: false, status: 500, error: 'השליחה נכשלה' }
}

/**
 * Open a thread, or add to the one that exists for this order.
 *
 * A carpentry writes to a supplier it can buy from, about a product or one of
 * its own orders. A supplier writes only about an order sent to it — it does
 * not start conversations with carpentries out of nowhere.
 */
export async function startThread(
  party: Party,
  input: {
    supplierId?: unknown
    orderId?: unknown
    productId?: unknown
    contactRequestId?: string
    body: unknown
    /** False when the caller already emailed the other side (the agent chat's question). */
    notify?: boolean
  }
): Promise<PostResult> {
  const body = cleanBody(input.body)
  if (!body) return { ok: false, status: 400, error: 'ההודעה ריקה' }
  const supabase = getSupabaseAdmin()

  let carpenterId: string
  let supplierId: string
  let orderId: string | null = null
  let productId: string | null = null
  let subject = 'שאלה לספק'

  if (typeof input.orderId === 'string' && input.orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, carpenter_id, supplier_id, short_number, order_number')
      .eq('id', input.orderId)
      .maybeSingle()
    const mine = order && (party.side === 'carpenter' ? order.carpenter_id === party.id : order.supplier_id === party.id)
    if (!order || !mine || !order.carpenter_id || !order.supplier_id) return { ok: false, status: 404, error: 'ההזמנה לא נמצאה' }
    carpenterId = order.carpenter_id
    supplierId = order.supplier_id
    orderId = order.id
    subject = `הזמנה ${order.short_number ? `#${order.short_number}` : order.order_number}`

    const { data: existing } = await supabase.from('message_threads').select(THREAD_COLUMNS).eq('order_id', order.id).maybeSingle()
    if (existing) {
      return (await append(existing as unknown as ThreadRow, party.side, body))
        ? { ok: true, threadId: (existing as unknown as ThreadRow).id }
        : { ok: false, status: 500, error: 'השליחה נכשלה' }
    }
  } else {
    if (party.side !== 'carpenter') return { ok: false, status: 400, error: 'ספק פותח שיחה רק על הזמנה' }
    if (typeof input.supplierId !== 'string') return { ok: false, status: 400, error: 'חסר ספק' }
    const { data: supplier } = await supabase.from('suppliers').select('id, status').eq('id', input.supplierId).maybeSingle()
    if (!supplier || supplier.status !== 'approved') return { ok: false, status: 404, error: 'הספק לא זמין' }
    carpenterId = party.id
    supplierId = supplier.id
    if (typeof input.productId === 'string' && input.productId) {
      const { data: product } = await supabase.from('products').select('id, name_he').eq('id', input.productId).maybeSingle()
      if (product) {
        productId = product.id
        subject = product.name_he.slice(0, 200)
      }
    }
  }

  const { data: created, error } = await supabase
    .from('message_threads')
    .insert({
      carpenter_id: carpenterId,
      supplier_id: supplierId,
      order_id: orderId,
      product_id: productId,
      contact_request_id: input.contactRequestId ?? null,
      subject,
      last_sender: party.side,
    })
    .select(THREAD_COLUMNS)
    .single()
  if (error || !created) {
    console.error('[messages] thread insert failed', error)
    return { ok: false, status: 500, error: 'פתיחת השיחה נכשלה' }
  }
  const row = created as unknown as ThreadRow
  return (await append(row, party.side, body, input.notify ?? true)) ? { ok: true, threadId: row.id } : { ok: false, status: 500, error: 'השליחה נכשלה' }
}

export async function setHandled(party: Party, threadId: string, handled: boolean): Promise<boolean> {
  const row = await ownThread(party, threadId)
  if (!row) return false
  const { error } = await getSupabaseAdmin()
    .from('message_threads')
    .update({ status: handled ? 'handled' : 'open' })
    .eq('id', row.id)
  return !error
}

/** For the admin console: how many threads a supplier has and how many wait for its answer. No content. */
export async function threadCountsBySupplier(): Promise<Map<string, { total: number; unanswered: number }>> {
  const { data, error } = await getSupabaseAdmin()
    .from('message_threads')
    .select('supplier_id, last_sender, status')
    .limit(20000)
  const counts = new Map<string, { total: number; unanswered: number }>()
  if (error) return counts
  for (const row of data ?? []) {
    const entry = counts.get(row.supplier_id) ?? { total: 0, unanswered: 0 }
    entry.total += 1
    if (row.last_sender === 'carpenter' && row.status === 'open') entry.unanswered += 1
    counts.set(row.supplier_id, entry)
  }
  return counts
}
