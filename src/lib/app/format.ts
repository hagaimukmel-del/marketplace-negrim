/**
 * Formatting for the purchasing app. Pure functions, safe on server and client.
 */

import { round2 } from '@/lib/vat'

/** "₪850", "₪33.60" — no trailing ".00" on whole amounts; agorot when they exist. */
export function money(value: number): string {
  const n = round2(value)
  const whole = Number.isInteger(n)
  return `₪${n.toLocaleString('he-IL', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

const DAY = 24 * 60 * 60 * 1000

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
}

/**
 * "היום 07:40", "אתמול 14:20", "לפני 3 ימים", "12.08.26".
 * `now` is passed in, never read here, so a page renders one consistent moment.
 */
export function when(iso: string | null | undefined, now: number): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY)
  if (days <= 0) return `היום ${clock(ms)}`
  if (days === 1) return `אתמול ${clock(ms)}`
  if (days < 30) return `לפני ${days} ימים`
  return new Date(ms).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** "לפני 26 שעות" — for how long something has been waiting. */
export function hoursAgo(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / (60 * 60 * 1000))
}

/** The number people say: "#1048". */
export function orderNo(shortNumber: number | null | undefined, fallback: string): string {
  return shortNumber ? `#${shortNumber}` : fallback
}

/** "שק 25 ק״ג" from a pack label and size; null when the supplier has not said. */
export function packText(label: string | null, qty: number | null, unit: string): string | null {
  if (!label) return null
  return qty ? `${label} ${qty} ${unit}` : label
}

/** Payment terms as the supplier set them: "שוטף+30 / שוטף+60". */
export function termsText(terms: string[] | null | undefined): string {
  return terms && terms.length ? terms.join(' / ') : 'לפי הסיכום עם הספק'
}
