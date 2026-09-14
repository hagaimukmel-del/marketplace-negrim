import 'server-only'

import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * How many wrong guesses at the operator password are tolerated.
 *
 * /admin is one shared passphrase. Without a limit it could be tried forever —
 * eight wrong guesses all came back 401 and the ninth was just as welcome — and
 * a passphrase with nothing slowing it down is only as strong as how fast
 * somebody can ask.
 *
 * The window is generous enough that a person mistyping their own password
 * three times never notices, and tight enough that automated guessing gets
 * roughly one attempt a minute instead of hundreds a second.
 */
const MAX_FAILURES = 6
const WINDOW_MINUTES = 15

/**
 * The caller's address as the platform reports it.
 *
 * Behind Vercel the socket address is always the proxy, so x-forwarded-for is
 * the only thing that names the client. It can be spoofed by whoever sets it —
 * but the proxy overwrites the leftmost entry it trusts, and an attacker
 * rotating the header is exactly what the audit trail is for.
 */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64)
  return request.headers.get('x-real-ip')?.slice(0, 64) ?? 'unknown'
}

export interface ThrottleVerdict {
  blocked: boolean
  /** Wrong guesses already recorded in the window. */
  failures: number
  ip: string
}

/** Whether this address has spent its attempts. Read-only. */
export async function checkLoginThrottle(request: NextRequest): Promise<ThrottleVerdict> {
  const ip = clientIp(request)
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()

  try {
    const { count } = await getSupabaseAdmin()
      .from('admin_login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('succeeded', false)
      .gte('attempted_at', since)

    const failures = count ?? 0
    return { blocked: failures >= MAX_FAILURES, failures, ip }
  } catch (err) {
    // A throttle that cannot read its own table must not lock the operator out
    // of their own console. Failing open here is the lesser risk: the password
    // check itself still has to pass.
    console.error('[throttle] could not be read', err)
    return { blocked: false, failures: 0, ip }
  }
}

/**
 * Record the attempt. A success wipes that address's recent failures, so
 * getting it right on the fourth try does not leave you two from a lockout.
 */
export async function recordLoginAttempt(ip: string, succeeded: boolean): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('admin_login_attempts').insert({ ip, succeeded })

    if (succeeded) {
      await supabase.from('admin_login_attempts').delete().eq('ip', ip).eq('succeeded', false)
    }

    // Opportunistic tidy-up, so the table cannot grow without bound. Cheap
    // enough to ride along on a login and needs no scheduled job.
    const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    await supabase.from('admin_login_attempts').delete().lt('attempted_at', cutoff)
  } catch (err) {
    console.error('[throttle] could not record an attempt', err)
  }
}

export const THROTTLE_WINDOW_MINUTES = WINDOW_MINUTES
