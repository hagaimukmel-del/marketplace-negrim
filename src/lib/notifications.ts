import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { queueEmail, type QueuedEmail } from './outbox'

/**
 * What a carpenter or a supplier sees under the bell (communication plan, step 1).
 *
 * Every event between the two sides goes through notify(): it writes the
 * notification the bell counts, and queues the email (if there is an address)
 * in the outbox, which sends and retries it. The site is where everything
 * lives; the email only says that something happened and links back.
 *
 * On a database without the table the bell shows nothing and the email still
 * goes out, through the outbox's own fallback.
 */

export type NotificationSide = 'carpenter' | 'supplier'

export interface Recipient {
  side: NotificationSide
  id: string
}

export type NotificationKind =
  | 'order_new'
  | 'order_confirmed'
  | 'order_rejected'
  | 'order_shipped'
  | 'order_delivered'
  | 'quote_new'
  | 'quote_answered'
  | 'quote_declined'
  | 'message_new'
  | 'email_failed'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  body: string | null
  link: string
  read: boolean
  createdAt: string
}

const ownColumn = (side: NotificationSide) => (side === 'carpenter' ? 'carpenter_id' : 'supplier_id')

export interface NotifyInput {
  to: Recipient
  kind: NotificationKind
  title: string
  body?: string | null
  /** A path in the site, e.g. `/app/orders/<id>`. */
  link: string
  orderId?: string | null
  quoteRequestId?: string | null
  threadId?: string | null
  /** The email that goes with it; left out when there is no address to send to. */
  email?: Omit<QueuedEmail, 'notificationId' | 'kind'> | null
}

/**
 * Write the notification and queue its email. Never throws: a notification
 * that fails must not fail the order or the message it is about.
 *
 * A new message in a thread that already has an unread notification for this
 * party refreshes that one instead of adding another, so a conversation is
 * one line under the bell, not ten.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const column = ownColumn(input.to.side)
    let notificationId: string | null = null

    if (input.kind === 'message_new' && input.threadId) {
      const { data: open } = await supabase
        .from('notifications')
        .select('id')
        .eq(column, input.to.id)
        .eq('thread_id', input.threadId)
        .eq('kind', 'message_new')
        .is('read_at', null)
        .limit(1)
        .maybeSingle()
      if (open) {
        await supabase
          .from('notifications')
          .update({ title: input.title, body: input.body ?? null, created_at: new Date().toISOString() })
          .eq('id', open.id)
        notificationId = open.id
      }
    }

    if (!notificationId) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_side: input.to.side,
          carpenter_id: input.to.side === 'carpenter' ? input.to.id : null,
          supplier_id: input.to.side === 'supplier' ? input.to.id : null,
          kind: input.kind,
          title: input.title.slice(0, 200),
          body: input.body ? input.body.slice(0, 400) : null,
          link: input.link,
          order_id: input.orderId ?? null,
          quote_request_id: input.quoteRequestId ?? null,
          thread_id: input.threadId ?? null,
        })
        .select('id')
        .single()
      if (error) console.error('[notifications] insert failed', error)
      notificationId = data?.id ?? null
    }

    if (input.email?.to) {
      await queueEmail({ ...input.email, kind: input.kind, notificationId })
    }
  } catch (err) {
    console.error('[notifications] notify failed', err)
  }
}

/** Unread notifications for the bell. Zero on a database without the table. */
export async function unreadNotificationCount(party: Recipient): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq(ownColumn(party.side), party.id)
    .is('read_at', null)
  if (error) return 0
  return count ?? 0
}

export async function listNotifications(party: Recipient, limit = 50): Promise<{ ready: boolean; items: NotificationItem[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .select('id, kind, title, body, link, read_at, created_at')
    .eq(ownColumn(party.side), party.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { ready: false, items: [] }
  return {
    ready: true,
    items: (data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind as NotificationKind,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.read_at != null,
      createdAt: row.created_at,
    })),
  }
}

/** Mark one read and return where it points, or null when it is not this party's. */
export async function openNotification(party: Recipient, id: string, markRead = true): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('notifications')
    .select('id, link, read_at')
    .eq('id', id)
    .eq(ownColumn(party.side), party.id)
    .maybeSingle()
  if (!data) return null
  if (markRead && !data.read_at) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', data.id)
  }
  return data.link
}

export async function markAllNotificationsRead(party: Recipient): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq(ownColumn(party.side), party.id)
    .is('read_at', null)
  return !error
}

/** Opening a thread, order or quote reads the notifications that point at it. */
export async function markNotificationsReadFor(
  party: Recipient,
  about: { threadId?: string; orderId?: string; quoteRequestId?: string }
): Promise<void> {
  const column = about.threadId ? 'thread_id' : about.orderId ? 'order_id' : about.quoteRequestId ? 'quote_request_id' : null
  const value = about.threadId ?? about.orderId ?? about.quoteRequestId
  if (!column || !value) return
  await getSupabaseAdmin()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq(ownColumn(party.side), party.id)
    .eq(column, value)
    .is('read_at', null)
}
