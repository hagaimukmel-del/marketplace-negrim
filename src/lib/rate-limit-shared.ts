import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { limitOf } from './rate-limit'

/**
 * The limits that guard an email to someone, counted from the database
 * (T-031, communication plan step 7).
 *
 * checkRateLimit() counts in one server's memory, so on Vercel each instance
 * and every cold start begins again from zero. Behind it, these count the rows
 * the person actually wrote in the window: questions to suppliers, quote
 * requests, messages. The memory check stays in front as the cheap first gate.
 *
 * A failed count lets the request through: the limit is a guard against
 * flooding, and refusing an honest message because a count failed is worse.
 */

type Party = { side: 'carpenter' | 'supplier'; id: string }
type Kind = 'supplierQuestion' | 'quoteRequest' | 'message'

async function countInWindow(kind: Kind, party: Party, since: string): Promise<number | null> {
  const supabase = getSupabaseAdmin()
  if (kind === 'supplierQuestion') {
    const { count, error } = await supabase
      .from('supplier_contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('carpenter_id', party.id)
      .gte('created_at', since)
    return error ? null : (count ?? 0)
  }
  if (kind === 'quoteRequest') {
    const { count, error } = await supabase
      .from('quote_requests')
      .select('id', { count: 'exact', head: true })
      .eq('carpenter_id', party.id)
      .gte('created_at', since)
    return error ? null : (count ?? 0)
  }
  // Messages carry their thread, not their author's id: the party's threads
  // that moved in the window, then this side's messages in them.
  const { data: threads, error: threadError } = await supabase
    .from('message_threads')
    .select('id')
    .eq(party.side === 'carpenter' ? 'carpenter_id' : 'supplier_id', party.id)
    .gte('last_message_at', since)
    .limit(200)
  if (threadError) return null
  if (!threads?.length) return 0
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('thread_id', threads.map((thread) => thread.id))
    .eq('sender', party.side)
    .gte('created_at', since)
  return error ? null : (count ?? 0)
}

/** True when this party already used up the limit in the window. */
export async function sharedLimitReached(kind: Kind, party: Party): Promise<boolean> {
  try {
    const { maxAttempts, windowMs } = limitOf(kind)
    const used = await countInWindow(kind, party, new Date(Date.now() - windowMs).toISOString())
    return used != null && used >= maxAttempts
  } catch (err) {
    console.error('[rate-limit] shared count failed', err)
    return false
  }
}
