import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName } from '@/lib/email'
import { markNotificationsReadFor, notify } from '@/lib/notifications'
import { newMessageHtml, newMessageSubject } from '@/lib/emails/new-message'
import { deletedCarpenterIds } from '@/lib/carpenter-deletion-server'

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
  /** Written by the site ("the supplier confirmed the order"), not by either side. */
  system: boolean
  body: string
  createdAt: string
}

export interface ThreadDetail extends ThreadSummary {
  orderId: string | null
  productId: string | null
  quoteRequestId: string | null
  /** When the other side last opened the thread: my messages before it are read. */
  otherReadAt: string | null
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
  quote_request_id?: string | null
  carpenter_id: string
  supplier_id: string
  carpenters: { business_name: string } | null
  suppliers: { company_name: string } | null
  orders: { short_number: number | null; order_number: string } | null
}

const THREAD_COLUMNS =
  'id, subject, status, last_message_at, last_sender, carpenter_last_read_at, supplier_last_read_at, order_id, product_id, quote_request_id, carpenter_id, supplier_id, ' +
  'carpenters(business_name), suppliers(company_name), orders(short_number, order_number)'

const ownColumn = (side: Side) => (side === 'carpenter' ? 'carpenter_id' : 'supplier_id')

/**
 * Carpentries a supplier must not see: deleted ones, until restored. A
 * carpentry's own side needs no check — a deleted one cannot sign in.
 */
async function hiddenFor(side: Side): Promise<Set<string>> {
  return side === 'supplier' ? deletedCarpenterIds() : new Set()
}

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
  const [{ data, error }, hidden] = await Promise.all([
    getSupabaseAdmin()
      .from('message_threads')
      .select('carpenter_id, last_sender, last_message_at, carpenter_last_read_at, supplier_last_read_at')
      .eq(ownColumn(party.side), party.id)
      .neq('last_sender', party.side)
      .limit(500),
    hiddenFor(party.side),
  ])
  if (error) return 0
  return (data ?? []).filter((row) => !hidden.has(row.carpenter_id) && isUnread(row, party.side)).length
}

export async function listThreads(party: Party): Promise<{ ready: boolean; threads: ThreadSummary[] }> {
  const [{ data, error }, hidden] = await Promise.all([
    getSupabaseAdmin()
      .from('message_threads')
      .select(THREAD_COLUMNS)
      .eq(ownColumn(party.side), party.id)
      .order('last_message_at', { ascending: false })
      .limit(200),
    hiddenFor(party.side),
  ])
  if (error) return { ready: false, threads: [] }
  const rows = ((data ?? []) as unknown as ThreadRow[]).filter((row) => !hidden.has(row.carpenter_id))
  return { ready: true, threads: rows.map((row) => summary(row, party.side)) }
}

async function ownThread(party: Party, threadId: string): Promise<ThreadRow | null> {
  const { data } = await getSupabaseAdmin()
    .from('message_threads')
    .select(THREAD_COLUMNS)
    .eq('id', threadId)
    .eq(ownColumn(party.side), party.id)
    .maybeSingle()
  const row = (data as unknown as ThreadRow | null) ?? null
  if (row && (await hiddenFor(party.side)).has(row.carpenter_id)) return null
  return row
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
    markNotificationsReadFor(party, { threadId: row.id }),
  ])
  return {
    ...summary(row, party.side),
    unread: false,
    orderId: row.order_id,
    productId: row.product_id,
    quoteRequestId: row.quote_request_id ?? null,
    otherReadAt: party.side === 'carpenter' ? row.supplier_last_read_at : row.carpenter_last_read_at,
    messages: (rows ?? []).map((m) => ({
      id: m.id,
      mine: m.sender === party.side,
      system: m.sender === 'system',
      body: m.body,
      createdAt: m.created_at,
    })),
  }
}

function cleanBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const body = raw.trim().slice(0, MAX_BODY)
  return body.length > 0 ? body : null
}

/**
 * Tell the other side: a line under its bell and an email through the outbox.
 * Best-effort, a failed notification never fails the message.
 *
 * A burst of messages is one bell line (refreshed) and one email per ten
 * minutes, so a back-and-forth does not bury the other side's inbox.
 */
async function notifyOtherSide(row: ThreadRow, from: Side, body: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const [{ data: carpenter }, { data: supplier }] = await Promise.all([
      supabase.from('carpenters').select('business_name, email, email_verified_at').eq('id', row.carpenter_id).maybeSingle(),
      supabase.from('suppliers').select('company_name, email').eq('id', row.supplier_id).maybeSingle(),
    ])
    const toSide: Side = from === 'carpenter' ? 'supplier' : 'carpenter'
    // A carpentry is mailed only at an address it has proved, like every other carpenter mail
    const to = from === 'carpenter' ? supplier?.email : carpenter?.email_verified_at ? carpenter.email : null
    const fromName = (from === 'carpenter' ? carpenter?.business_name : supplier?.company_name) ?? 'שוק הנגרים'
    const path = toSide === 'supplier' ? `/supplier/messages/${row.id}` : `/app/messages/${row.id}`
    await notify({
      to: { side: toSide, id: toSide === 'supplier' ? row.supplier_id : row.carpenter_id },
      kind: 'message_new',
      title: `הודעה חדשה מ${fromName}`,
      body: `${row.subject} · ${body.slice(0, 120)}`,
      link: path,
      threadId: row.id,
      orderId: row.order_id,
      email: to
        ? {
            to,
            subject: newMessageSubject(fromName, row.subject),
            html: newMessageHtml({ fromName, subject: row.subject, body, path }),
            isTest: isTestName(carpenter?.business_name, supplier?.company_name),
            dedupeKey: `thread:${row.id}:${toSide}`,
            // A reply to this mail would land in the company inbox and never reach
            // the conversation; a no-reply address (auto-answering "reply on the
            // site") sends people back to the thread. Unset, the default stays.
            replyTo: process.env.EMAIL_NO_REPLY || null,
          }
        : null,
    })
  } catch (err) {
    console.error('[messages] notify failed', err)
  }
}

/** PostgREST's "no such function": a database before migration 20261025140000. */
function missingFunction(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202' || error?.code === '42883'
}

/**
 * Save a message and update its thread in one transaction (post_message), so
 * a message can never be saved without the inbox showing it. A resend with the
 * same clientId returns the message already saved instead of a second copy.
 */
async function append(row: ThreadRow, from: Side, body: string, notify = true, clientId: string | null = null): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('post_message', {
    p_thread: row.id,
    p_sender: from,
    p_body: body,
    ...(clientId ? { p_client_id: clientId } : {}),
  })
  if (missingFunction(error)) return appendWithoutFunction(row, from, body, notify)
  if (error || !data) {
    console.error('[messages] post failed', error)
    return false
  }
  // A resend of a message already saved: the other side was told the first time.
  const fresh = Date.now() - new Date(data.created_at).getTime() < 60_000
  if (notify && fresh) await notifyOtherSide(row, from, body)
  return true
}

/** The two-step write, for a database that does not have post_message yet. */
async function appendWithoutFunction(row: ThreadRow, from: Side, body: string, notify: boolean): Promise<boolean> {
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

/** A message id from the browser, for a safe resend; anything else is ignored. */
function cleanClientId(raw: unknown): string | null {
  return typeof raw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw.toLowerCase() : null
}

/**
 * A line from the site in the conversation about an order or a quote ("the
 * supplier confirmed the order"). Only when that conversation exists; the bell
 * carries the news either way. Never throws.
 */
export async function postSystemMessage(about: { orderId?: string; quoteRequestId?: string }, body: string): Promise<void> {
  try {
    const column = about.orderId ? 'order_id' : 'quote_request_id'
    const value = about.orderId ?? about.quoteRequestId
    if (!value) return
    const supabase = getSupabaseAdmin()
    const { data: thread } = await supabase.from('message_threads').select('id').eq(column, value).maybeSingle()
    if (!thread) return
    const { error } = await supabase.rpc('post_message', { p_thread: thread.id, p_sender: 'system', p_body: body.slice(0, MAX_BODY) })
    if (error && !missingFunction(error)) console.error('[messages] system message failed', error)
  } catch (err) {
    console.error('[messages] system message failed', err)
  }
}

/**
 * Open the conversation of a new quote request: the request itself as a line
 * from the site, then the carpentry's note as its first message. The supplier
 * is not notified from here; the quote request already was. Returns the
 * thread id, or null on a database without quote threads.
 */
export async function openQuoteThread(input: {
  carpenterId: string
  supplierId: string
  quoteRequestId: string
  productId: string
  subject: string
  summary: string
  note: string | null
}): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin()
    const { data: existing } = await supabase.from('message_threads').select('id').eq('quote_request_id', input.quoteRequestId).maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('message_threads')
      .insert({
        carpenter_id: input.carpenterId,
        supplier_id: input.supplierId,
        product_id: input.productId,
        quote_request_id: input.quoteRequestId,
        subject: input.subject.slice(0, 200),
        last_sender: 'carpenter',
      })
      .select(THREAD_COLUMNS)
      .single()
    if (error || !created) {
      if (error) console.error('[messages] quote thread not opened', error)
      return null
    }
    const row = created as unknown as ThreadRow
    await supabase.rpc('post_message', { p_thread: row.id, p_sender: 'system', p_body: input.summary.slice(0, MAX_BODY) })
    if (input.note) await append(row, 'carpenter', input.note.slice(0, MAX_BODY), false)
    return row.id
  } catch (err) {
    console.error('[messages] quote thread not opened', err)
    return null
  }
}

/** The conversation of each of these quote requests, for links from the quote lists. */
export async function quoteThreadIds(quoteRequestIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (quoteRequestIds.length === 0) return map
  const { data, error } = await getSupabaseAdmin()
    .from('message_threads')
    .select('id, quote_request_id')
    .in('quote_request_id', quoteRequestIds)
  if (error) return map
  for (const row of data ?? []) if (row.quote_request_id) map.set(row.quote_request_id, row.id)
  return map
}

export type PostResult = { ok: true; threadId: string } | { ok: false; status: number; error: string }

export async function reply(party: Party, threadId: string, rawBody: unknown, rawClientId?: unknown): Promise<PostResult> {
  const body = cleanBody(rawBody)
  if (!body) return { ok: false, status: 400, error: 'ההודעה ריקה' }
  const row = await ownThread(party, threadId)
  if (!row) return { ok: false, status: 404, error: 'השיחה לא נמצאה' }
  return (await append(row, party.side, body, true, cleanClientId(rawClientId)))
    ? { ok: true, threadId: row.id }
    : { ok: false, status: 500, error: 'השליחה נכשלה' }
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
