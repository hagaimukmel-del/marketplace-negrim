/**
 * דרושים: job ads by carpentries and suppliers. The vocabulary and the rules,
 * in one place, so the form, the API, the board and the tests read one list.
 *
 * No database and no server imports. The table checks the same values
 * (migration 20261110130000_job_posts); change both together.
 */

import { nationalPhone } from './phone'
import { regionsForCity } from './regions'

/**
 * Six regions, the owner's list for this board (2026-11-10). The keys match
 * lib/regions.ts; Haifa and the Krayot sit under the north here.
 */
export const JOB_REGIONS = [
  { key: 'north', name: 'צפון' },
  { key: 'sharon', name: 'השרון' },
  { key: 'center', name: 'מרכז' },
  { key: 'shfela', name: 'שפלה' },
  { key: 'jerusalem', name: 'י-ם והסביבה' },
  { key: 'south', name: 'דרום' },
] as const

export type JobRegion = (typeof JOB_REGIONS)[number]['key']

export function isJobRegion(value: unknown): value is JobRegion {
  return JOB_REGIONS.some((region) => region.key === value)
}

export function jobRegionName(key: string): string {
  return JOB_REGIONS.find((region) => region.key === key)?.name ?? key
}

/** The region to start the form on, from the business's city. */
export function jobRegionForCity(city: string | null | undefined): JobRegion | '' {
  const first = regionsForCity(city)[0]
  if (!first) return ''
  if (first === 'haifa') return 'north'
  return isJobRegion(first) ? first : ''
}

/** Sunday to Friday. Index = the number stored in job_posts.weekdays. */
export const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'] as const

export const JOB_SCOPES = [
  { key: 'full', name: 'משרה מלאה', short: 'מלאה' },
  { key: 'part', name: 'משרה חלקית', short: 'חלקית' },
  { key: 'temp', name: 'עבודה זמנית', short: 'עבודה זמנית' },
  { key: 'freelance', name: 'פרילנס', short: 'פרילנס' },
] as const

export type JobScope = (typeof JOB_SCOPES)[number]['key']

export function isJobScope(value: unknown): value is JobScope {
  return JOB_SCOPES.some((scope) => scope.key === value)
}

export function jobScopeName(key: string | null): string | null {
  return JOB_SCOPES.find((scope) => scope.key === key)?.name ?? null
}

export type DaysMode = 'weekdays' | 'dates' | 'free'

/**
 * What the poster agrees to before sending (owner, 2026-11-10): the request
 * goes to a staffing company that works with the site, not to other carpentries.
 */
export const JOB_CONSENT_TEXT =
  'אני מאשר/ת שפרטי הבקשה, כולל שם העסק והטלפון, יועברו לחברת כוח אדם שעובדת עם נגרים B2B, לצורך איתור עובדים. הבקשה לא תוצג לנגריות אחרות.'

/** How long an ad stays on the board. */
export const JOB_POST_DAYS = 30
/** How far ahead a work date may be picked. */
export const JOB_DATES_AHEAD_DAYS = 90
export const JOB_DATES_MAX = 31
export const JOB_DESCRIPTION_MAX = 600

const DAY = 86_400_000

/** What the form sends. Everything is a string or a list, as typed. */
export interface JobInput {
  businessName?: unknown
  region?: unknown
  location?: unknown
  role?: unknown
  salary?: unknown
  daysMode?: unknown
  weekdays?: unknown
  dates?: unknown
  daysText?: unknown
  hours?: unknown
  scope?: unknown
  description?: unknown
  phone?: unknown
  /** The poster agreed that the request goes to the staffing partner (JOB_CONSENT_TEXT). */
  consent?: unknown
}

/** The checked row, in the table's column names. */
export interface JobFields {
  business_name: string
  region: JobRegion
  location: string
  role: string
  salary: string | null
  days_mode: DaysMode
  weekdays: number[]
  work_dates: string[]
  days_text: string | null
  hours: string | null
  scope: JobScope | null
  description: string | null
  contact_phone: string
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/** "2026-12-06" for a Date, in UTC, the way the dates are stored. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Read and check an ad. Returns the row, or the first problem in words the
 * person filling the form understands. `now` decides which dates are past.
 */
export function readJobInput(input: JobInput, now: Date): JobFields | string {
  const businessName = text(input.businessName, 80)
  if (!businessName || businessName.length < 2) return 'צריך את שם העסק'

  if (!isJobRegion(input.region)) return 'צריך לבחור אזור'
  const location = text(input.location, 80)
  if (!location || location.length < 2) return 'צריך עיר או מקום'

  const role = text(input.role, 80)
  if (!role || role.length < 2) return 'צריך תפקיד'

  const mode = input.daysMode
  let weekdays: number[] = []
  let dates: string[] = []
  let daysText: string | null = null

  if (mode === 'weekdays') {
    const list = Array.isArray(input.weekdays) ? input.weekdays : []
    weekdays = [...new Set(list.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day < WEEKDAYS.length))].sort()
    if (weekdays.length === 0) return 'צריך לסמן לפחות יום עבודה אחד'
  } else if (mode === 'dates') {
    const list = Array.isArray(input.dates) ? input.dates : []
    const first = isoDay(now)
    const last = isoDay(new Date(now.getTime() + JOB_DATES_AHEAD_DAYS * DAY))
    dates = [...new Set(list.filter((day): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))]
      .filter((day) => !Number.isNaN(Date.parse(day)) && day >= first && day <= last)
      .sort()
    if (dates.length === 0) return 'צריך לבחור לפחות תאריך אחד בלוח'
    if (dates.length > JOB_DATES_MAX) return `עד ${JOB_DATES_MAX} תאריכים. לתקופה ארוכה, סמנו ימים בשבוע`
  } else if (mode === 'free') {
    daysText = text(input.daysText, 120)
    if (!daysText) return 'צריך לכתוב את ימי העבודה'
  } else {
    return 'צריך לבחור איך לתת את ימי העבודה'
  }

  const scope = input.scope == null || input.scope === '' ? null : input.scope
  if (scope !== null && !isJobScope(scope)) return 'היקף משרה לא מוכר'

  const phone = nationalPhone(typeof input.phone === 'string' ? input.phone : null)
  if (!phone) return 'צריך מספר טלפון תקין לפניות'

  if (input.consent !== true) return 'צריך לאשר את העברת הפרטים לחברת כוח האדם'

  return {
    business_name: businessName,
    region: input.region,
    location,
    role,
    salary: text(input.salary, 80),
    days_mode: mode,
    weekdays,
    work_dates: dates,
    days_text: daysText,
    hours: mode === 'weekdays' ? text(input.hours, 40) : null,
    scope,
    description: typeof input.description === 'string' ? input.description.trim().slice(0, JOB_DESCRIPTION_MAX) || null : null,
    contact_phone: phone,
  }
}

export function jobExpiry(now: Date): string {
  return new Date(now.getTime() + JOB_POST_DAYS * DAY).toISOString()
}

/** "6.12" from "2026-12-06". */
export function dayMonth(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(day)}.${Number(month)}`
}

/**
 * The work days as one line: "א׳–ה׳, 07:00–16:00", "6.12–15.12 (8 ימים)",
 * or what was typed. Consecutive weekdays fold into a range.
 */
export function daysLabel(post: { daysMode: DaysMode; weekdays: number[]; dates: string[]; daysText: string | null; hours: string | null }): string {
  if (post.daysMode === 'free') return post.daysText ?? ''
  if (post.daysMode === 'dates') {
    const { dates } = post
    if (dates.length === 0) return ''
    if (dates.length === 1) return dayMonth(dates[0])
    const span = `${dayMonth(dates[0])}–${dayMonth(dates[dates.length - 1])}`
    return `${span} (${dates.length} ימים)`
  }
  const days = [...post.weekdays].sort()
  const runs: string[] = []
  let start = 0
  for (let i = 1; i <= days.length; i++) {
    if (i === days.length || days[i] !== days[i - 1] + 1) {
      const from = days[start]
      const to = days[i - 1]
      runs.push(to - from >= 2 ? `${WEEKDAYS[from]}–${WEEKDAYS[to]}` : days.slice(start, i).map((day) => WEEKDAYS[day]).join(', '))
      start = i
    }
  }
  const label = runs.join(', ')
  return post.hours ? `${label}, ${post.hours}` : label
}

/** A card on the board. Never the phone: that is fetched on a tap. */
export interface JobCard {
  id: string
  side: 'carpenter' | 'supplier'
  businessName: string
  region: string
  location: string
  role: string
  salary: string | null
  daysMode: DaysMode
  weekdays: number[]
  dates: string[]
  daysText: string | null
  hours: string | null
  scope: string | null
  description: string | null
  createdAt: string
  expiresAt: string
  mine: boolean
}

/** One of the poster's own ads, on "המודעות שלי". */
export interface MyJob extends JobCard {
  status: 'open' | 'closed' | 'removed'
}

/** How long ago, in words. */
export function postedAgo(createdAt: string, now = Date.now()): string {
  const hours = Math.floor((now - new Date(createdAt).getTime()) / 3_600_000)
  if (hours < 1) return 'עכשיו'
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return days < 14 ? 'לפני שבוע' : `לפני ${Math.floor(days / 7)} שבועות`
}
