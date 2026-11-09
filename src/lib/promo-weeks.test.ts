import { describe, expect, it } from 'vitest'
import { canCancelPromo, cancelDeadline } from './promo-weeks'

// Sunday 2026-11-22; noon in Israel on the given day.
const WEEK = '2026-11-22'
const at = (date: string) => new Date(`${date}T10:00:00Z`)

describe('cancelling a "מוצר השבוע" booking', () => {
  it('ends on the Thursday before the week', () => {
    expect(cancelDeadline(WEEK)).toBe('2026-11-19')
  })

  it('lets an approved week go until that Thursday, not after', () => {
    expect(canCancelPromo('approved', WEEK, at('2026-11-19'))).toBe(true)
    expect(canCancelPromo('approved', WEEK, at('2026-11-20'))).toBe(false)
  })

  it('counts the day in Israel, not UTC', () => {
    // 22:30 UTC on Thursday is already Friday in Israel.
    expect(canCancelPromo('approved', WEEK, new Date('2026-11-19T22:30:00Z'))).toBe(false)
  })

  it('always lets an undecided request be withdrawn, never a closed one', () => {
    expect(canCancelPromo('requested', WEEK, at('2026-11-21'))).toBe(true)
    expect(canCancelPromo('rejected', WEEK, at('2026-11-01'))).toBe(false)
    expect(canCancelPromo('cancelled', WEEK, at('2026-11-01'))).toBe(false)
  })
})
