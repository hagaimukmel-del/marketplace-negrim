import { describe, expect, it } from 'vitest'
import { isReportHour, reportKey, reportWindow } from './weekly-report-rules'

describe('isReportHour', () => {
  it('sends in winter (UTC+2) from the 13:00 UTC run only', () => {
    // Thursday 2026-11-05
    expect(isReportHour(new Date('2026-11-05T13:00:00Z'))).toBe(true)
    expect(isReportHour(new Date('2026-11-05T13:45:00Z'))).toBe(true)
    expect(isReportHour(new Date('2026-11-05T12:10:00Z'))).toBe(false)
  })

  it('sends in summer (UTC+3) from the 12:00 UTC run only', () => {
    // Thursday 2027-06-03
    expect(isReportHour(new Date('2027-06-03T12:20:00Z'))).toBe(true)
    expect(isReportHour(new Date('2027-06-03T13:20:00Z'))).toBe(false)
  })

  it('does not send on other days', () => {
    expect(isReportHour(new Date('2026-11-04T13:00:00Z'))).toBe(false)
    expect(isReportHour(new Date('2026-11-06T13:00:00Z'))).toBe(false)
  })
})

describe('reportWindow and reportKey', () => {
  it('covers the seven days up to the top of the hour', () => {
    const { from, to } = reportWindow(new Date('2026-11-05T13:37:12Z'))
    expect(to.toISOString()).toBe('2026-11-05T13:00:00.000Z')
    expect(from.toISOString()).toBe('2026-10-29T13:00:00.000Z')
  })

  it('keys by the Israel date', () => {
    expect(reportKey(new Date('2026-11-05T13:00:00Z'))).toBe('weekly-report:2026-11-05')
  })
})
