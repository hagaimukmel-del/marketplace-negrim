/**
 * The operator's weekly signup report, as rules (no database, no mail).
 *
 * The owner asked for it every Thursday at 15:00 Israel time (2026-11-02).
 * Vercel crons run in UTC and know nothing of daylight saving, so vercel.json
 * schedules two runs on Thursday, 12:00 and 13:00 UTC: 15:00 in summer (UTC+3)
 * and 15:00 in winter (UTC+2). Each run asks `isReportHour` and only the one
 * that lands in 15:00 Israel time sends. On the Hobby plan a cron fires
 * anywhere inside its hour, which still falls inside 15:xx.
 */

export const REPORT_TIME_ZONE = 'Asia/Jerusalem'
/** Thursday, as Intl names it. */
export const REPORT_WEEKDAY = 'Thu'
export const REPORT_HOUR = 15
export const REPORT_DAYS = 7

function israelParts(now: Date): { weekday: string; hour: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

/** True during Thursday 15:00–15:59 in Israel, whatever the season. */
export function isReportHour(now: Date): boolean {
  const { weekday, hour } = israelParts(now)
  return weekday === REPORT_WEEKDAY && hour === REPORT_HOUR
}

/** The Israel calendar date of a run, e.g. "2026-11-05". Keys the report so it goes out once. */
export function reportDate(now: Date): string {
  return israelParts(now).date
}

/** The key the report is recorded under in reminder_log. */
export function reportKey(now: Date): string {
  return `weekly-report:${reportDate(now)}`
}

/**
 * The week the report covers: the seven days that end at the top of the
 * current hour. The hour is whole in Israel too (its offsets are whole hours),
 * so a run at 15:37 covers last Thursday 15:00 to today 15:00.
 */
export function reportWindow(now: Date): { from: Date; to: Date } {
  const to = new Date(now)
  to.setUTCMinutes(0, 0, 0)
  const from = new Date(to.getTime() - REPORT_DAYS * 24 * 60 * 60 * 1000)
  return { from, to }
}

export interface SignupCounts {
  /** Carpentries that signed up themselves (/join), test businesses left out. */
  carpentersSelf: number
  /** Carpentries the operator added from a list in the same week. */
  carpentersImported: number
  /** Supplier applications (/supplier-join), test businesses left out. */
  suppliersApplied: number
  /** Suppliers the operator added from the console. */
  suppliersAdded: number
  /** Suppliers waiting for approval right now, from any week. */
  suppliersPending: number
}

export function reportSubject(counts: SignupCounts): string {
  return `דוח שבועי: ${counts.carpentersSelf} נגריות ו-${counts.suppliersApplied} ספקים נרשמו השבוע`
}
