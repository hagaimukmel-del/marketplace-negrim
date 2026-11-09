import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * The six-digit code in the login email.
 *
 * The emailed link signs in whichever browser opens it. On a phone that is
 * often the mail app's own browser, so the carpenter "logged in" and is still
 * logged out where they were. The code is typed on the page that asked for
 * it, so it signs in that page.
 *
 * Six digits can be guessed, so each code is a row (login_codes): it expires
 * after ten minutes, works once, and dies after five wrong tries. Asking for
 * a new code retires the older ones, so only the latest email counts.
 *
 * Suppliers sign in the same way (supplier_login_codes): same rules, their
 * own table and their own hash label.
 */

const TTL_MS = 10 * 60 * 1000
export const MAX_ATTEMPTS = 5

export interface LoginCarpenter {
  id: string
  business_name: string
  email: string | null
  email_verified_at: string | null
  token: string
}

const COLUMNS = 'id, business_name, email, email_verified_at, token'

/**
 * The active carpentry an email or phone number belongs to, or null. Phones
 * are matched on their last nine digits, as /api/join stores them.
 */
export async function findCarpenterByIdentifier(identifier: string): Promise<LoginCarpenter | null> {
  const supabase = getSupabaseAdmin()
  if (identifier.includes('@')) {
    const pattern = identifier.trim().toLowerCase().replace(/[\\%_]/g, (char: string) => `\\${char}`)
    const { data } = await supabase.from('carpenters').select(COLUMNS).ilike('email', pattern).eq('is_active', true).limit(1).maybeSingle()
    return data ?? null
  }
  const digits = identifier.replace(/\D/g, '')
  if (digits.length < 9) return null
  const { data } = await supabase.from('carpenters').select(COLUMNS).eq('phone', digits.slice(-9)).eq('is_active', true).limit(1).maybeSingle()
  return data ?? null
}

/** Digits only, so "123 456" and "123-456" are the same code. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Who a code belongs to. Carpentries and suppliers keep their codes in
 * separate tables, and each kind hashes under its own label, so a code
 * issued to one can never sign in the other.
 */
export type LoginCodeKind = 'carpenter' | 'supplier'

const LABEL: Record<LoginCodeKind, string> = {
  carpenter: 'carpenter-login-code.v1',
  supplier: 'supplier-login-code.v1',
}

/**
 * Bound to the account, so a code's hash means nothing for anyone else.
 * Its own label, so it can never pass as a session cookie or email proof.
 */
export function hashCode(ownerId: string, code: string, kind: LoginCodeKind = 'carpenter'): string {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 16) throw new Error('ADMIN_SECRET is missing or too short (needs 16+ characters).')
  const key = createHmac('sha256', secret).update(LABEL[kind]).digest()
  return createHmac('sha256', key).update(`${ownerId}:${code}`).digest('base64url')
}

/**
 * The few queries a code needs, against the kind's own table. Written out per
 * table so each stays fully typed against database.types.
 */
function codeStore(kind: LoginCodeKind, ownerId: string) {
  const supabase = getSupabaseAdmin()
  if (kind === 'supplier') {
    return {
      retireOpen: (usedAt: string) => supabase.from('supplier_login_codes').update({ used_at: usedAt }).eq('supplier_id', ownerId).is('used_at', null),
      insert: (row: { code_hash: string; expires_at: string }) => supabase.from('supplier_login_codes').insert({ supplier_id: ownerId, ...row }),
      latestOpen: () =>
        supabase
          .from('supplier_login_codes')
          .select('id, code_hash, attempts, expires_at')
          .eq('supplier_id', ownerId)
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      count: (id: string, attempts: number) =>
        supabase.from('supplier_login_codes').update({ attempts: attempts + 1 }).eq('id', id).eq('attempts', attempts).select('id'),
      use: (id: string) => supabase.from('supplier_login_codes').update({ used_at: new Date().toISOString() }).eq('id', id).is('used_at', null).select('id'),
    }
  }
  return {
    retireOpen: (usedAt: string) => supabase.from('login_codes').update({ used_at: usedAt }).eq('carpenter_id', ownerId).is('used_at', null),
    insert: (row: { code_hash: string; expires_at: string }) => supabase.from('login_codes').insert({ carpenter_id: ownerId, ...row }),
    latestOpen: () =>
      supabase
        .from('login_codes')
        .select('id, code_hash, attempts, expires_at')
        .eq('carpenter_id', ownerId)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    count: (id: string, attempts: number) =>
      supabase.from('login_codes').update({ attempts: attempts + 1 }).eq('id', id).eq('attempts', attempts).select('id'),
    use: (id: string) => supabase.from('login_codes').update({ used_at: new Date().toISOString() }).eq('id', id).is('used_at', null).select('id'),
  }
}

/** A new code for this account. Older unused ones stop working. */
export async function issueLoginCode(ownerId: string, kind: LoginCodeKind = 'carpenter'): Promise<string> {
  const store = codeStore(kind, ownerId)
  const now = new Date()
  await store.retireOpen(now.toISOString())

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const { error } = await store.insert({
    code_hash: hashCode(ownerId, code, kind),
    expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
  })
  if (error) throw new Error(`Could not store login code: ${error.message}`)
  return code
}

/**
 * A code for the login email, or undefined if one could not be stored. The
 * email then goes out with the link alone: still a way in, just not the
 * typed one.
 */
export async function loginCodeForEmail(ownerId: string, kind: LoginCodeKind = 'carpenter'): Promise<string | undefined> {
  try {
    return await issueLoginCode(ownerId, kind)
  } catch (err) {
    console.error('Login code not issued, sending the link alone:', err)
    return undefined
  }
}

/**
 * Whether `input` is this account's live code. Every try counts against
 * the code, and a match uses it up.
 */
export async function consumeLoginCode(ownerId: string, input: string, kind: LoginCodeKind = 'carpenter'): Promise<boolean> {
  const code = normalizeCode(input)
  if (code.length !== 6) return false

  const store = codeStore(kind, ownerId)
  const { data: row } = await store.latestOpen()

  if (!row || row.attempts >= MAX_ATTEMPTS || new Date(row.expires_at).getTime() < Date.now()) return false

  // Every guess is counted before it is checked, and only if the count read
  // is still current: parallel guesses cannot share one attempt.
  const { data: counted } = await store.count(row.id, row.attempts)
  if (!counted || counted.length === 0) return false

  const expected = Buffer.from(row.code_hash)
  const actual = Buffer.from(hashCode(ownerId, code, kind))
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false

  // Only the request that flips used_at gets in, if the same code is sent twice.
  const { data: used } = await store.use(row.id)
  return Boolean(used && used.length > 0)
}

/**
 * Remove code rows that expired more than a day ago. A spent or expired code
 * opens nothing, so keeping it only keeps data the privacy notice says is
 * short-lived. Run daily from the outbox cron.
 */
export async function purgeExpiredLoginCodes(now: Date = new Date()): Promise<number> {
  const supabase = getSupabaseAdmin()
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  let removed = 0
  for (const table of ['login_codes', 'supplier_login_codes'] as const) {
    const { count, error } = await supabase.from(table).delete({ count: 'exact' }).lt('expires_at', cutoff)
    if (error) console.error(`[login-code] purge ${table} failed`, error.message)
    else removed += count ?? 0
  }
  return removed
}
