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
 * Bound to the carpentry, so a code's hash means nothing for anyone else.
 * Its own label, so it can never pass as a session cookie or email proof.
 */
export function hashCode(carpenterId: string, code: string): string {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 16) throw new Error('ADMIN_SECRET is missing or too short (needs 16+ characters).')
  const key = createHmac('sha256', secret).update('carpenter-login-code.v1').digest()
  return createHmac('sha256', key).update(`${carpenterId}:${code}`).digest('base64url')
}

/** A new code for this carpentry. Older unused ones stop working. */
export async function issueLoginCode(carpenterId: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  await supabase.from('login_codes').update({ used_at: now.toISOString() }).eq('carpenter_id', carpenterId).is('used_at', null)

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const { error } = await supabase.from('login_codes').insert({
    carpenter_id: carpenterId,
    code_hash: hashCode(carpenterId, code),
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
export async function loginCodeForEmail(carpenterId: string): Promise<string | undefined> {
  try {
    return await issueLoginCode(carpenterId)
  } catch (err) {
    console.error('Login code not issued, sending the link alone:', err)
    return undefined
  }
}

/**
 * Whether `input` is this carpentry's live code. Every try counts against
 * the code, and a match uses it up.
 */
export async function consumeLoginCode(carpenterId: string, input: string): Promise<boolean> {
  const code = normalizeCode(input)
  if (code.length !== 6) return false

  const supabase = getSupabaseAdmin()
  const { data: row } = await supabase
    .from('login_codes')
    .select('id, code_hash, attempts, expires_at')
    .eq('carpenter_id', carpenterId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row || row.attempts >= MAX_ATTEMPTS || new Date(row.expires_at).getTime() < Date.now()) return false

  // Every guess is counted before it is checked, and only if the count read
  // is still current: parallel guesses cannot share one attempt.
  const { data: counted } = await supabase
    .from('login_codes')
    .update({ attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('attempts', row.attempts)
    .select('id')
  if (!counted || counted.length === 0) return false

  const expected = Buffer.from(row.code_hash)
  const actual = Buffer.from(hashCode(carpenterId, code))
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false

  // Only the request that flips used_at gets in, if the same code is sent twice.
  const { data: used } = await supabase
    .from('login_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id')
  return Boolean(used && used.length > 0)
}
