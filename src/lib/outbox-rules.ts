/**
 * The rules the email outbox follows, kept apart from the database so they can
 * be tested on their own (communication plan, step 1).
 *
 * A mail is tried right after it is queued. If the provider fails, it waits
 * 1, 5, 30 and then 120 minutes between tries; after the fifth failed try it
 * is marked failed and the operator is told. A refusal that will never change
 * (a malformed address, a rejected request) is failed at once instead of
 * being retried for two and a half hours.
 */

export const MAX_ATTEMPTS = 5

/** Minutes to wait after the Nth failed try (1-based), before the next one. */
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120] as const

/** Message emails to the same person about the same thread within this window fold into one. */
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000

export interface SendOutcomeInput {
  sent: boolean
  reason?: 'no-provider' | 'failed'
  status?: number
}

export type OutboxStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface Outcome {
  status: OutboxStatus
  /** When to try again; only for 'pending'. */
  nextAttemptAt?: Date
}

/**
 * A 4xx is the provider saying the request itself is wrong; trying again
 * sends the same wrong request. Timeouts (408) and rate limits (429) are the
 * exception: those pass.
 */
export function isPermanentFailure(status: number | undefined): boolean {
  if (status == null) return false
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

/** What becomes of a row after one try. `attempts` already counts this try. */
export function outcomeOf(result: SendOutcomeInput, attempts: number, now: Date = new Date()): Outcome {
  if (result.sent) return { status: 'sent' }
  // No provider configured (a local machine): nothing will ever send it.
  if (result.reason === 'no-provider') return { status: 'skipped' }
  if (isPermanentFailure(result.status) || attempts >= MAX_ATTEMPTS) return { status: 'failed' }
  const minutes = RETRY_DELAYS_MINUTES[Math.max(0, Math.min(attempts, RETRY_DELAYS_MINUTES.length) - 1)]
  return { status: 'pending', nextAttemptAt: new Date(now.getTime() + minutes * 60_000) }
}

/** Whether a new mail with this key should be held back because one just went out. */
export function withinDedupeWindow(lastQueuedAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!lastQueuedAt) return false
  const at = typeof lastQueuedAt === 'string' ? new Date(lastQueuedAt) : lastQueuedAt
  return now.getTime() - at.getTime() < DEDUPE_WINDOW_MS
}
