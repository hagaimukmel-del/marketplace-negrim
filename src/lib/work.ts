/**
 * נגרים עובדים ביחד: the vocabulary and the rules, in one place.
 *
 * No database and no server imports, so the forms, the screens, the API and
 * the tests all read the same lists. The tables check the same values
 * (migration 20261015130000_work_network); change both together.
 */

import { isRegionKey } from '@/lib/regions'

/**
 * The launch terms, said the same way on every screen (owner, 2026-10-29):
 * free until January 2027, then a fixed term, prices excl. VAT.
 */
export const WORK_FREE_UNTIL = 'ללא תשלום עד ינואר 2027'
export const WORK_PRICES = 'אחר כך: 350 ₪ לחצי שנה או 470 ₪ לשנה, לפני מע״מ. תקופה קבועה, בלי חידוש אוטומטי.'

export const JOB_TYPES = [
  { key: 'cnc', name: 'חיתוך / CNC' },
  { key: 'edging', name: 'קנטים' },
  { key: 'paint', name: 'צביעה וריסוס' },
  { key: 'fronts', name: 'ייצור חזיתות' },
  { key: 'carcasses', name: 'ייצור גופים' },
  { key: 'install', name: 'הרכבה והתקנה' },
  { key: 'project_help', name: 'עזרה בפרויקט' },
  { key: 'other', name: 'אחר' },
] as const

export type JobType = (typeof JOB_TYPES)[number]['key']

export function isJobType(value: unknown): value is JobType {
  return typeof value === 'string' && JOB_TYPES.some((type) => type.key === value)
}

export function jobTypeName(key: string): string {
  return JOB_TYPES.find((type) => type.key === key)?.name ?? key
}

export const REPORT_REASONS = [
  { key: 'not_real', name: 'לא עבודה אמיתית' },
  { key: 'service_ad', name: 'פרסומת לשירות' },
  { key: 'hiring', name: 'דרוש עובד' },
  { key: 'inappropriate', name: 'תוכן לא ראוי' },
  { key: 'duplicate', name: 'כפולה' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['key']

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && REPORT_REASONS.some((reason) => reason.key === value)
}

export const CLOSE_OUTCOMES = [
  { key: 'via_nagarim', name: 'מצאתי נגרייה דרך נגרים' },
  { key: 'other_way', name: 'מצאתי בדרך אחרת' },
  { key: 'cancelled', name: 'העבודה בוטלה' },
] as const

export type CloseOutcome = (typeof CLOSE_OUTCOMES)[number]['key']

export function isCloseOutcome(value: unknown): value is CloseOutcome {
  return typeof value === 'string' && CLOSE_OUTCOMES.some((outcome) => outcome.key === value)
}

/** The longest a job stays on the board, whatever its due date. */
export const JOB_MAX_DAYS = 30
/** How far ahead a due date may be. Further than this is not "needs help now". */
export const DUE_MAX_DAYS = 90
export const DESCRIPTION_MAX = 800
export const DESCRIPTION_MIN = 10

/** Spam thresholds: far above honest use, low enough to stop a flood. */
export const POSTS_PER_DAY = 5
export const OPEN_JOBS_MAX = 20
/** Open reports from different carpentries that take a job off the board. */
export const REPORTS_TO_PAUSE = 3

const DAY = 86_400_000

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/** "2026-10-28" for a Date, in Israel's calendar. Due dates are calendar days. */
export function isoDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(date)
}

/**
 * A due date the board accepts: a real calendar day, not in the past, and
 * not more than DUE_MAX_DAYS ahead. Returns the day as YYYY-MM-DD, or null.
 */
export function readDueDate(raw: unknown, now: Date): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const parsed = new Date(`${raw}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || isoDay(parsed) !== raw) return null
  const today = isoDay(now)
  const last = isoDay(new Date(now.getTime() + DUE_MAX_DAYS * DAY))
  if (raw < today || raw > last) return null
  return raw
}

/**
 * When a job leaves the board: the end of its due date, or JOB_MAX_DAYS after
 * posting, whichever comes first. The end of the due day is 20:59 UTC: 23:59
 * in Israel's summer, 22:59 in winter, the same calendar day either way.
 */
export function jobExpiry(dueDate: string, now: Date): Date {
  const endOfDue = new Date(`${dueDate}T20:59:00Z`)
  const cap = new Date(now.getTime() + JOB_MAX_DAYS * DAY)
  return endOfDue < cap ? endOfDue : cap
}

/** Whole days until a job leaves the board, for "פג תוקף בעוד N ימים". */
export function daysLeft(expiresAt: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY))
}

export interface JobFields {
  job_type: JobType
  region: string
  quantity: string
  material: string | null
  due_date: string
  description: string
}

/**
 * A job as posted, read and checked. Returns the fields, or the message to
 * show. The description is checked whole rather than cut: a carpenter who
 * wrote 900 characters should hear about it, not lose the end.
 */
export function readJobFields(input: Record<string, unknown>, now: Date): JobFields | string {
  if (!isJobType(input.job_type)) return 'צריך לבחור במה צריך עזרה'
  if (!isRegionKey(input.region)) return 'צריך לבחור אזור'

  const quantity = text(input.quantity, 80)
  if (!quantity) return 'צריך לכתוב כמות או היקף'

  const dueDate = readDueDate(input.due_date, now)
  if (!dueDate) return `צריך מועד ביצוע, מהיום ועד ${DUE_MAX_DAYS} יום קדימה`

  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (description.length < DESCRIPTION_MIN) return 'צריך תיאור קצר של העבודה'
  if (description.length > DESCRIPTION_MAX) return `התיאור עד ${DESCRIPTION_MAX} תווים`

  return {
    job_type: input.job_type,
    region: input.region,
    quantity,
    material: text(input.material, 120),
    due_date: dueDate,
    description,
  }
}

export interface ProfileFields {
  job_types: JobType[]
  regions: string[]
  machines: string | null
  notify_email: boolean
}

/** The capabilities profile, read and checked. At least one type and one region. */
export function readProfileFields(input: Record<string, unknown>): ProfileFields | string {
  const types = Array.isArray(input.job_types) ? [...new Set(input.job_types.filter(isJobType))] : []
  if (types.length === 0) return 'צריך לבחור לפחות סוג עבודה אחד'
  const regions = Array.isArray(input.regions) ? [...new Set(input.regions.filter(isRegionKey))] : []
  if (regions.length === 0) return 'צריך לבחור לפחות אזור אחד'
  return {
    job_types: types,
    regions,
    machines: text(input.machines, 300),
    notify_email: input.notify_email !== false,
  }
}

/** "לפני שעה", "אתמול": when a job went up, the way the board says it. */
export function ago(createdAt: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000))
  if (minutes < 2) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return 'לפני שעה'
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

export interface SubscriptionState {
  status: string
  ends_at: string | null
}

/**
 * Whether a carpentry may use the service: post, answer, and see who posted.
 * Founding members (the free launch) may; a paid term may until it ends; a
 * cancelled one, an expired one, and no row at all may not.
 */
export function subscriptionGrants(subscription: SubscriptionState | null, now: Date): boolean {
  if (!subscription) return false
  if (subscription.status === 'founding') return true
  if (subscription.status === 'active') {
    return subscription.ends_at != null && new Date(subscription.ends_at) > now
  }
  return false
}

export interface JobRow {
  id: string
  carpenter_id: string
  job_type: string
  region: string
  quantity: string
  material: string | null
  due_date: string
  description: string
  image_url: string | null
  status: string
  expires_at: string
  created_at: string
}

export interface Poster {
  businessName: string
  city: string | null
}

/** What a screen may show about one job. `poster` is null for anyone who may not see it. */
export interface BoardJob {
  id: string
  jobType: string
  region: string
  quantity: string
  material: string | null
  dueDate: string
  description: string
  imageUrl: string | null
  expiresAt: string
  createdAt: string
  mine: boolean
  poster: Poster | null
}

/**
 * The one place that decides what leaves the server about a job.
 *
 * The poster's identity goes only to members and to the poster. Hiding it in
 * the screen is not enough: whatever the server sends, the browser has.
 */
export function toBoardJob(
  row: JobRow,
  poster: Poster | null,
  viewer: { carpenterId: string | null; member: boolean; admin: boolean }
): BoardJob {
  const mine = viewer.carpenterId != null && row.carpenter_id === viewer.carpenterId
  return {
    id: row.id,
    jobType: row.job_type,
    region: row.region,
    quantity: row.quantity,
    material: row.material,
    dueDate: row.due_date,
    description: row.description,
    imageUrl: row.image_url,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    mine,
    poster: viewer.member || viewer.admin || mine ? poster : null,
  }
}

/** "28.10" for a YYYY-MM-DD due date. */
export function shortDate(day: string): string {
  const [, month, date] = day.split('-')
  return `${Number(date)}.${month}`
}

/** Below this the count says "empty" more than "connected", so it is not shown (owner, 2026-10-30). */
export const CONNECTED_MIN = 3

/** "34 נגריות מחוברות לשירות", or null below CONNECTED_MIN. */
export function connectedLabel(count: number | null): string | null {
  if (count === null || count < CONNECTED_MIN) return null
  return `${count.toLocaleString('he-IL')} נגריות מחוברות לשירות`
}
