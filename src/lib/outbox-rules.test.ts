import { describe, expect, it } from 'vitest'
import { DEDUPE_WINDOW_MS, MAX_ATTEMPTS, isPermanentFailure, outcomeOf, withinDedupeWindow } from './outbox-rules'

const now = new Date('2026-10-25T12:00:00Z')
const minutesLater = (outcome: ReturnType<typeof outcomeOf>) =>
  outcome.nextAttemptAt ? (outcome.nextAttemptAt.getTime() - now.getTime()) / 60_000 : null

describe('outcomeOf', () => {
  it('marks a sent mail sent', () => {
    expect(outcomeOf({ sent: true }, 1, now)).toEqual({ status: 'sent' })
  })

  it('skips when no provider is configured', () => {
    expect(outcomeOf({ sent: false, reason: 'no-provider' }, 1, now)).toEqual({ status: 'skipped' })
  })

  it('backs off 1, 5, 30, 120 minutes, then gives up', () => {
    const failed = { sent: false, reason: 'failed' as const, status: 500 }
    expect(minutesLater(outcomeOf(failed, 1, now))).toBe(1)
    expect(minutesLater(outcomeOf(failed, 2, now))).toBe(5)
    expect(minutesLater(outcomeOf(failed, 3, now))).toBe(30)
    expect(minutesLater(outcomeOf(failed, 4, now))).toBe(120)
    expect(outcomeOf(failed, MAX_ATTEMPTS, now)).toEqual({ status: 'failed' })
  })

  it('retries a request that never got an answer (timeout, network)', () => {
    expect(outcomeOf({ sent: false, reason: 'failed' }, 1, now).status).toBe('pending')
  })

  it('fails a permanent refusal at once', () => {
    expect(outcomeOf({ sent: false, reason: 'failed', status: 422 }, 1, now)).toEqual({ status: 'failed' })
  })

  it('retries rate limits and provider timeouts', () => {
    expect(outcomeOf({ sent: false, reason: 'failed', status: 429 }, 1, now).status).toBe('pending')
    expect(outcomeOf({ sent: false, reason: 'failed', status: 408 }, 1, now).status).toBe('pending')
  })
})

describe('isPermanentFailure', () => {
  it('treats 4xx as permanent except 408 and 429', () => {
    expect(isPermanentFailure(400)).toBe(true)
    expect(isPermanentFailure(403)).toBe(true)
    expect(isPermanentFailure(408)).toBe(false)
    expect(isPermanentFailure(429)).toBe(false)
    expect(isPermanentFailure(503)).toBe(false)
    expect(isPermanentFailure(undefined)).toBe(false)
  })
})

describe('withinDedupeWindow', () => {
  it('holds back a mail queued inside the window', () => {
    expect(withinDedupeWindow(new Date(now.getTime() - 60_000), now)).toBe(true)
    expect(withinDedupeWindow(new Date(now.getTime() - DEDUPE_WINDOW_MS - 1), now).valueOf()).toBe(false)
    expect(withinDedupeWindow(null, now)).toBe(false)
  })
})
