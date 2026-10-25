import { describe, expect, it } from 'vitest'
import { isWorkingTime, israelWorkday, workingMinutesBetween } from './working-hours'

// 2026-10-25 is a Sunday. Israel is UTC+2 after the clock change on 2026-10-25 (02:00).
const il = (local: string) => new Date(`${local}+02:00`)

describe('workingMinutesBetween', () => {
  it('counts minutes inside one working day', () => {
    expect(workingMinutesBetween(il('2026-10-26T09:00:00'), il('2026-10-26T11:30:00'))).toBe(150)
  })

  it('stops at closing time and starts at opening time', () => {
    expect(workingMinutesBetween(il('2026-10-26T16:00:00'), il('2026-10-27T09:00:00'))).toBe(120)
    expect(workingMinutesBetween(il('2026-10-26T06:00:00'), il('2026-10-26T08:30:00'))).toBe(30)
  })

  it('counts a short Friday and skips Saturday', () => {
    // Thursday 16:00 → Sunday 09:00: 60 (Thu) + 300 (Fri) + 0 (Sat) + 60 (Sun)
    expect(workingMinutesBetween(il('2026-10-29T16:00:00'), il('2026-11-01T09:00:00'))).toBe(420)
  })

  it('is zero backwards and over a weekend night', () => {
    expect(workingMinutesBetween(il('2026-10-26T11:00:00'), il('2026-10-26T10:00:00'))).toBe(0)
    expect(workingMinutesBetween(il('2026-10-30T14:00:00'), il('2026-10-31T22:00:00'))).toBe(0)
  })

  it('reads summer time too', () => {
    // 2026-10-22 (Thursday), Israel still at UTC+3.
    expect(workingMinutesBetween(new Date('2026-10-22T06:00:00+03:00'), new Date('2026-10-22T10:00:00+03:00'))).toBe(120)
  })
})

describe('isWorkingTime and israelWorkday', () => {
  it('knows the windows', () => {
    expect(isWorkingTime(il('2026-10-26T10:00:00'))).toBe(true)
    expect(isWorkingTime(il('2026-10-26T17:00:00'))).toBe(false)
    expect(isWorkingTime(il('2026-10-30T12:59:00'))).toBe(true)
    expect(isWorkingTime(il('2026-10-30T13:00:00'))).toBe(false)
    expect(isWorkingTime(il('2026-10-31T10:00:00'))).toBe(false)
  })

  it('gives Israel’s date, not UTC’s', () => {
    expect(israelWorkday(new Date('2026-10-30T23:30:00Z'))).toEqual({ date: '2026-10-31', working: false })
    expect(israelWorkday(il('2026-10-25T08:00:00'))).toEqual({ date: '2026-10-25', working: true })
  })
})
