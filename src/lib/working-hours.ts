/**
 * Working time in Israel, for the reminder ladder (communication plan, step 5).
 *
 * A supplier who got an order at 16:50 on Thursday has not ignored it for
 * three days by Sunday morning; they have had ten minutes of working time.
 * Reminders count working minutes, not clock minutes: Sunday to Thursday
 * 08:00-17:00, Friday 08:00-13:00, Saturday none. Holidays are not known here.
 *
 * Pure: everything is computed on Israel wall-clock time, read through Intl.
 * The clock change happens at night, outside every window, so working wall
 * clock minutes equal real ones.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** [start, end] hours of the working window, by day of week (0 = Sunday). */
const WINDOWS: ([number, number] | null)[] = [[8, 17], [8, 17], [8, 17], [8, 17], [8, 17], [8, 13], null]

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** The instant's Israel wall-clock time, as milliseconds in a UTC calendar. */
function wallClock(ms: number): number {
  const p: Record<string, number> = {}
  for (const part of parts.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/** Working minutes between two instants (0 when `to` is not after `from`). */
export function workingMinutesBetween(from: Date | string, to: Date | string): number {
  const start = wallClock(new Date(from).getTime())
  const end = wallClock(new Date(to).getTime())
  if (!(end > start)) return 0
  let total = 0
  // Sixty days is far past the last rung of any ladder; it bounds the loop.
  for (let day = Math.floor(start / DAY_MS) * DAY_MS, n = 0; day < end && n < 60; day += DAY_MS, n += 1) {
    const window = WINDOWS[new Date(day).getUTCDay()]
    if (!window) continue
    const open = Math.max(start, day + window[0] * HOUR_MS)
    const close = Math.min(end, day + window[1] * HOUR_MS)
    if (close > open) total += close - open
  }
  return Math.floor(total / 60_000)
}

/** Whether this instant is inside a working window. */
export function isWorkingTime(at: Date | string = new Date()): boolean {
  const wall = wallClock(new Date(at).getTime())
  const window = WINDOWS[new Date(wall).getUTCDay()]
  if (!window) return false
  const hour = (wall % DAY_MS) / HOUR_MS
  return hour >= window[0] && hour < window[1]
}

/** Israel's date for this instant, YYYY-MM-DD, and whether it is a working day. */
export function israelWorkday(at: Date | string = new Date()): { date: string; working: boolean } {
  const wall = new Date(wallClock(new Date(at).getTime()))
  return { date: wall.toISOString().slice(0, 10), working: WINDOWS[wall.getUTCDay()] != null }
}
