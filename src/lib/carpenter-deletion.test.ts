import { describe, expect, it } from 'vitest'
import { daysLeft, purgeCutoff, purgeDate, restoredFields } from './carpenter-deletion'

describe('purgeDate', () => {
  it('is three calendar months after deletion', () => {
    expect(purgeDate('2026-10-26T09:00:00Z').toISOString()).toBe('2027-01-26T09:00:00.000Z')
  })

  it('stays inside a short month instead of spilling over', () => {
    expect(purgeDate('2026-11-30T12:00:00Z').toISOString()).toBe('2027-02-28T12:00:00.000Z')
  })
})

describe('purgeCutoff', () => {
  it('is three months back, so a row deleted exactly then is due', () => {
    const now = new Date('2027-01-26T09:00:00Z')
    expect(purgeCutoff(now).toISOString()).toBe('2026-10-26T09:00:00.000Z')
    expect(purgeDate(purgeCutoff(now)).getTime()).toBe(now.getTime())
  })
})

describe('daysLeft', () => {
  it('counts down and stops at zero', () => {
    expect(daysLeft('2026-10-26T09:00:00Z', new Date('2026-10-26T09:00:00Z'))).toBe(92)
    expect(daysLeft('2026-10-26T09:00:00Z', new Date('2027-03-01T00:00:00Z'))).toBe(0)
  })
})

describe('restoredFields', () => {
  it('brings a blocked carpentry back blocked', () => {
    expect(restoredFields(false)).toEqual({ is_active: false, deleted_at: null, deleted_by: null, active_before_delete: null })
  })

  it('brings an active one back active, and treats unknown as active', () => {
    expect(restoredFields(true).is_active).toBe(true)
    expect(restoredFields(null).is_active).toBe(true)
  })
})
