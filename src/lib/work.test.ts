import { describe, expect, it } from 'vitest'
import {
  ago,
  daysLeft,
  isoDay,
  jobExpiry,
  readDueDate,
  readJobFields,
  readProfileFields,
  shortDate,
  subscriptionGrants,
  toBoardJob,
  type JobRow,
} from './work'

// 15.10.2026, 10:00 in Israel (UTC+3).
const NOW = new Date('2026-10-15T07:00:00Z')

const ROW: JobRow = {
  id: 'j1',
  carpenter_id: 'c-poster',
  job_type: 'cnc',
  region: 'south',
  quantity: '40 לוחות',
  material: 'MDF 18',
  due_date: '2026-10-28',
  description: 'חיתוך לפי קובץ DXF',
  image_url: null,
  status: 'open',
  expires_at: '2026-10-28T20:59:00Z',
  created_at: '2026-10-15T06:00:00Z',
}
const POSTER = { businessName: 'נגריית הדרום', city: 'באר שבע' }

describe('due date and expiry', () => {
  it('takes a day from today up to 90 days ahead', () => {
    expect(readDueDate('2026-10-15', NOW)).toBe('2026-10-15')
    expect(readDueDate('2027-01-13', NOW)).toBe('2027-01-13')
    expect(readDueDate('2027-01-14', NOW)).toBeNull()
    expect(readDueDate('2026-10-14', NOW)).toBeNull()
  })

  it('refuses a day that does not exist or is not a date', () => {
    expect(readDueDate('2026-02-30', NOW)).toBeNull()
    expect(readDueDate('28.10.2026', NOW)).toBeNull()
    expect(readDueDate(20261028, NOW)).toBeNull()
  })

  it('leaves the board at the end of the due day, in Israel', () => {
    const expiry = jobExpiry('2026-10-28', NOW)
    expect(isoDay(expiry)).toBe('2026-10-28')
    // Summer time ends 25.10: the same rule still lands on the due day.
    expect(isoDay(jobExpiry('2026-11-05', NOW))).toBe('2026-11-05')
  })

  it('never stays more than 30 days', () => {
    expect(jobExpiry('2027-01-10', NOW).toISOString()).toBe('2026-11-14T07:00:00.000Z')
  })

  it('counts whole days left, never below zero', () => {
    expect(daysLeft('2026-10-17T07:00:00Z', NOW)).toBe(2)
    expect(daysLeft('2026-10-01T00:00:00Z', NOW)).toBe(0)
  })
})

describe('readJobFields', () => {
  const good = { job_type: 'edging', region: 'south', quantity: ' 120 מטר ', material: '', due_date: '2026-10-20', description: 'קנט ABS על 14 חזיתות' }

  it('reads a good job and trims it', () => {
    expect(readJobFields(good, NOW)).toEqual({
      job_type: 'edging',
      region: 'south',
      quantity: '120 מטר',
      material: null,
      due_date: '2026-10-20',
      description: 'קנט ABS על 14 חזיתות',
    })
  })

  it('refuses a type or region outside the closed lists', () => {
    expect(typeof readJobFields({ ...good, job_type: 'hiring' }, NOW)).toBe('string')
    expect(typeof readJobFields({ ...good, region: 'eilat' }, NOW)).toBe('string')
  })

  it('refuses a description too short or too long, rather than cutting it', () => {
    expect(typeof readJobFields({ ...good, description: 'קצר' }, NOW)).toBe('string')
    expect(typeof readJobFields({ ...good, description: 'א'.repeat(801) }, NOW)).toBe('string')
    expect(typeof readJobFields({ ...good, description: 'א'.repeat(800) }, NOW)).toBe('object')
  })

  it('needs a quantity and a due date', () => {
    expect(typeof readJobFields({ ...good, quantity: '  ' }, NOW)).toBe('string')
    expect(typeof readJobFields({ ...good, due_date: '' }, NOW)).toBe('string')
  })
})

describe('readProfileFields', () => {
  it('keeps known types and regions only, once each', () => {
    expect(readProfileFields({ job_types: ['cnc', 'cnc', 'x'], regions: ['south', 'mars'], machines: ' CNC ' })).toEqual({
      job_types: ['cnc'],
      regions: ['south'],
      machines: 'CNC',
      notify_email: true,
    })
  })

  it('needs at least one type and one region', () => {
    expect(typeof readProfileFields({ job_types: [], regions: ['south'] })).toBe('string')
    expect(typeof readProfileFields({ job_types: ['cnc'], regions: [] })).toBe('string')
  })
})

describe('subscriptionGrants', () => {
  it('lets founding members in', () => {
    expect(subscriptionGrants({ status: 'founding', ends_at: null }, NOW)).toBe(true)
  })

  it('lets a paid term in until it ends, with no renewal', () => {
    expect(subscriptionGrants({ status: 'active', ends_at: '2027-04-15T00:00:00Z' }, NOW)).toBe(true)
    expect(subscriptionGrants({ status: 'active', ends_at: '2026-10-01T00:00:00Z' }, NOW)).toBe(false)
    expect(subscriptionGrants({ status: 'active', ends_at: null }, NOW)).toBe(false)
  })

  it('keeps out a cancelled one and no row at all', () => {
    expect(subscriptionGrants({ status: 'cancelled', ends_at: '2027-04-15T00:00:00Z' }, NOW)).toBe(false)
    expect(subscriptionGrants(null, NOW)).toBe(false)
  })
})

describe('toBoardJob: who may see the poster', () => {
  it('hides the poster from a carpentry without a subscription', () => {
    const job = toBoardJob(ROW, POSTER, { carpenterId: 'viewer', member: false, admin: false })
    expect(job.poster).toBeNull()
    expect(JSON.stringify(job)).not.toContain('נגריית הדרום')
    expect(JSON.stringify(job)).not.toContain('c-poster')
  })

  it('shows the poster to a member, to the operator and to the poster', () => {
    expect(toBoardJob(ROW, POSTER, { carpenterId: 'viewer', member: true, admin: false }).poster).toEqual(POSTER)
    expect(toBoardJob(ROW, POSTER, { carpenterId: null, member: false, admin: true }).poster).toEqual(POSTER)
    const own = toBoardJob(ROW, POSTER, { carpenterId: 'c-poster', member: false, admin: false })
    expect(own.mine).toBe(true)
    expect(own.poster).toEqual(POSTER)
  })
})

describe('display', () => {
  it('writes dates and ages the way the board does', () => {
    expect(shortDate('2026-10-08')).toBe('8.10')
    expect(ago('2026-10-15T06:00:00Z', NOW)).toBe('לפני שעה')
    expect(ago('2026-10-14T06:00:00Z', NOW)).toBe('אתמול')
    expect(ago('2026-10-15T06:59:30Z', NOW)).toBe('עכשיו')
  })
})
