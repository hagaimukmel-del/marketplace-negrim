import { describe, expect, it } from 'vitest'
import {
  NOTIFY_PER_DAY,
  fitsJob,
  isUnsubscribeSignature,
  kindForMessage,
  mayEmail,
  notifyForMessage,
  underCap,
  unsubscribeSignature,
} from './work-notify'

const ready = { email: 'a@example.com', email_verified_at: '2026-10-01T00:00:00Z', is_active: true, notify_email: true }

describe('mayEmail', () => {
  it('needs an active carpentry that opted in, with a verified address', () => {
    expect(mayEmail(ready)).toBe(true)
    expect(mayEmail(null)).toBe(false)
    expect(mayEmail({ ...ready, email: null })).toBe(false)
    expect(mayEmail({ ...ready, email_verified_at: null })).toBe(false)
    expect(mayEmail({ ...ready, notify_email: false })).toBe(false)
    expect(mayEmail({ ...ready, is_active: false })).toBe(false)
  })
})

describe('underCap', () => {
  it('stops at the daily cap', () => {
    expect(underCap(0)).toBe(true)
    expect(underCap(NOTIFY_PER_DAY - 1)).toBe(true)
    expect(underCap(NOTIFY_PER_DAY)).toBe(false)
  })
})

describe('fitsJob', () => {
  const profile = { job_types: ['edging', 'cnc'], regions: ['center', 'south'] }
  it('needs both the type and the region', () => {
    expect(fitsJob(profile, { job_type: 'edging', region: 'south' })).toBe(true)
    expect(fitsJob(profile, { job_type: 'paint', region: 'south' })).toBe(false)
    expect(fitsJob(profile, { job_type: 'edging', region: 'north' })).toBe(false)
  })
})

describe('notifyForMessage', () => {
  it('emails the first unread message, then waits until the conversation is read', () => {
    expect(notifyForMessage(null, null)).toBe(true)
    expect(notifyForMessage('2026-10-22T10:00:00Z', null)).toBe(false)
    expect(notifyForMessage('2026-10-22T10:00:00Z', '2026-10-22T09:00:00Z')).toBe(false)
    expect(notifyForMessage('2026-10-22T10:00:00Z', '2026-10-22T11:00:00Z')).toBe(true)
  })
})

describe('kindForMessage', () => {
  it("calls the applicant's opening message an answer", () => {
    expect(kindForMessage('applicant', 1)).toBe('answer')
    expect(kindForMessage('applicant', 2)).toBe('message')
    expect(kindForMessage('poster', 1)).toBe('message')
  })
})

describe('unsubscribe signature', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const secret = 'a-secret-of-sixteen-plus'
  it('accepts its own signature and nothing else', () => {
    const signature = unsubscribeSignature(id, secret)
    expect(isUnsubscribeSignature(id, signature, secret)).toBe(true)
    expect(isUnsubscribeSignature('22222222-2222-4222-8222-222222222222', signature, secret)).toBe(false)
    expect(isUnsubscribeSignature(id, signature, 'another-secret-entirely')).toBe(false)
    expect(isUnsubscribeSignature(id, '', secret)).toBe(false)
  })
})
