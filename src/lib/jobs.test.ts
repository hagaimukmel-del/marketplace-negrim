import { describe, expect, it } from 'vitest'
import { daysLabel, jobRegionForCity, readJobInput, type JobInput } from './jobs'

const NOW = new Date('2026-11-10T12:00:00Z')

const base: JobInput = {
  businessName: ' נגריית  אלון ',
  region: 'center',
  location: 'פתח תקווה, קריית אריה',
  role: 'נגר/ית ייצור',
  salary: '',
  daysMode: 'weekdays',
  weekdays: ['4', 0, 1, 2, 3, 3, 9],
  hours: '07:00–16:00',
  scope: 'full',
  description: 'ניסיון במטבחים',
  phone: '050-123-4567',
}

describe('readJobInput', () => {
  it('reads a full ad into the row', () => {
    const fields = readJobInput(base, NOW)
    expect(fields).toMatchObject({
      business_name: 'נגריית אלון',
      region: 'center',
      salary: null,
      days_mode: 'weekdays',
      weekdays: [0, 1, 2, 3, 4],
      work_dates: [],
      hours: '07:00–16:00',
      scope: 'full',
      contact_phone: '0501234567',
    })
  })

  it('asks for every required field in turn', () => {
    expect(readJobInput({ ...base, businessName: '' }, NOW)).toBe('צריך את שם העסק')
    expect(readJobInput({ ...base, region: 'haifa' }, NOW)).toBe('צריך לבחור אזור')
    expect(readJobInput({ ...base, location: ' ' }, NOW)).toBe('צריך עיר או מקום')
    expect(readJobInput({ ...base, role: '' }, NOW)).toBe('צריך תפקיד')
    expect(readJobInput({ ...base, weekdays: [] }, NOW)).toBe('צריך לסמן לפחות יום עבודה אחד')
    expect(readJobInput({ ...base, phone: '123' }, NOW)).toBe('צריך מספר טלפון תקין לפניות')
    expect(readJobInput({ ...base, scope: 'forever' }, NOW)).toBe('היקף משרה לא מוכר')
  })

  it('keeps only dates from today up to 90 days ahead', () => {
    const fields = readJobInput(
      { ...base, daysMode: 'dates', dates: ['2026-12-07', '2026-12-06', '2026-11-01', '2027-06-01', 'nope', '2026-12-06'] },
      NOW
    )
    expect(fields).toMatchObject({ days_mode: 'dates', work_dates: ['2026-12-06', '2026-12-07'], weekdays: [], hours: null })
    expect(readJobInput({ ...base, daysMode: 'dates', dates: ['2026-01-01'] }, NOW)).toBe('צריך לבחור לפחות תאריך אחד בלוח')
  })

  it('takes typed days as they are', () => {
    expect(readJobInput({ ...base, daysMode: 'free', daysText: 'גמיש, 3 ימים בשבוע' }, NOW)).toMatchObject({
      days_mode: 'free',
      days_text: 'גמיש, 3 ימים בשבוע',
    })
    expect(readJobInput({ ...base, daysMode: 'free', daysText: '' }, NOW)).toBe('צריך לכתוב את ימי העבודה')
  })
})

describe('daysLabel', () => {
  const post = { daysMode: 'weekdays' as const, weekdays: [0, 1, 2, 3, 4], dates: [], daysText: null, hours: null }
  it('folds consecutive weekdays into a range', () => {
    expect(daysLabel(post)).toBe('א׳–ה׳')
    expect(daysLabel({ ...post, weekdays: [0, 2, 3], hours: '8–17' })).toBe('א׳, ג׳, ד׳, 8–17')
  })
  it('shows a span of dates and how many', () => {
    expect(daysLabel({ ...post, daysMode: 'dates', dates: ['2026-12-06', '2026-12-07', '2026-12-15'] })).toBe('6.12–15.12 (3 ימים)')
  })
})

describe('jobRegionForCity', () => {
  it('puts Haifa under the north', () => {
    expect(jobRegionForCity('חיפה')).toBe('north')
    expect(jobRegionForCity('')).toBe('')
  })
})
