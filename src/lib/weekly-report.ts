import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, operatorEmail, sendEmail, siteUrl } from './email'
import { emailLogo } from './emails/brand'
import {
  isReportHour,
  reportKey,
  reportSubject,
  reportWindow,
  REPORT_TIME_ZONE,
  type SignupCounts,
} from './weekly-report-rules'

/**
 * The weekly signup report to the operator (owner, 2026-11-02): how many
 * carpentries and suppliers registered in the past week, every Thursday at
 * 15:00 Israel time. Run by /api/cron/weekly-report; the timing rules are in
 * weekly-report-rules.ts.
 *
 * The run is claimed in reminder_log under the Israel date before sending, so
 * the two Thursday crons (and any retry) send it once.
 */

const FONT = 'Arial,Helvetica,sans-serif'
/** Names listed in the mail; the rest are counted. */
const LIST_LIMIT = 15

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Signup {
  name: string
  city: string | null
}

interface WeekSignups {
  counts: SignupCounts
  carpenters: Signup[]
  suppliers: Signup[]
}

async function loadWeek(from: Date, to: Date): Promise<WeekSignups> {
  const supabase = getSupabaseAdmin()
  const [carpenters, suppliers, pending] = await Promise.all([
    supabase
      .from('carpenters')
      .select('business_name, city, source, created_at')
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('suppliers')
      .select('company_name, city, source, created_at')
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  if (carpenters.error) throw new Error(`carpenters: ${carpenters.error.message}`)
  if (suppliers.error) throw new Error(`suppliers: ${suppliers.error.message}`)

  const realCarpenters = (carpenters.data ?? []).filter((row) => !isTestName(row.business_name))
  const realSuppliers = (suppliers.data ?? []).filter((row) => !isTestName(row.company_name))
  const selfCarpenters = realCarpenters.filter((row) => row.source === 'self')
  const selfSuppliers = realSuppliers.filter((row) => row.source === 'self')

  return {
    counts: {
      carpentersSelf: selfCarpenters.length,
      carpentersImported: realCarpenters.length - selfCarpenters.length,
      suppliersApplied: selfSuppliers.length,
      suppliersAdded: realSuppliers.length - selfSuppliers.length,
      suppliersPending: pending.count ?? 0,
    },
    carpenters: selfCarpenters.map((row) => ({ name: row.business_name, city: row.city })),
    suppliers: selfSuppliers.map((row) => ({ name: row.company_name, city: row.city })),
  }
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('he-IL', { timeZone: REPORT_TIME_ZONE, day: 'numeric', month: 'numeric' })
}

function list(title: string, people: Signup[]): string {
  if (people.length === 0) return ''
  const shown = people.slice(0, LIST_LIMIT)
  const rest = people.length - shown.length
  const items = shown
    .map((person) => `<li>${escapeHtml(person.name)}${person.city ? ` · ${escapeHtml(person.city)}` : ''}</li>`)
    .join('')
  return `
    <div style="margin-top:16px;font:bold 14px ${FONT}">${title}</div>
    <ul style="margin:6px 0 0;padding-inline-start:20px">${items}</ul>
    ${rest > 0 ? `<div style="color:#78716c;font-size:13px">ועוד ${rest}</div>` : ''}`
}

function stat(label: string, value: number, note?: string): string {
  return `
    <td style="padding:12px;text-align:center;background:#fafaf9;border-radius:10px;width:50%">
      <div style="font:bold 28px ${FONT};color:#047857">${value}</div>
      <div style="font:14px ${FONT}">${label}</div>
      ${note ? `<div style="font:12px ${FONT};color:#78716c;margin-top:2px">${note}</div>` : ''}
    </td>`
}

export function weeklyReportHtml(week: WeekSignups, from: Date, to: Date): string {
  const { counts } = week
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 20px ${FONT}">הרשמות השבוע</div>
          <div style="color:#78716c">${formatDay(from)} – ${formatDay(to)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-top:12px">
            <tr>
              ${stat('נגריות נרשמו', counts.carpentersSelf, counts.carpentersImported ? `ועוד ${counts.carpentersImported} שהוספת מרשימה` : undefined)}
              ${stat('ספקים נרשמו', counts.suppliersApplied, counts.suppliersAdded ? `ועוד ${counts.suppliersAdded} שהוספת ידנית` : undefined)}
            </tr>
          </table>
          ${
            counts.suppliersPending > 0
              ? `<p style="margin:14px 0 0;background:#fef3c7;border-radius:8px;padding:10px 12px;color:#78350f">
                   <strong>${counts.suppliersPending} ${counts.suppliersPending === 1 ? 'ספק ממתין' : 'ספקים ממתינים'} לאישור.</strong>
                   <a href="${siteUrl()}/admin/suppliers" style="color:#78350f">למסך הספקים</a>
                 </p>`
              : ''
          }
          ${list('נגריות חדשות', week.carpenters)}
          ${list('ספקים חדשים', week.suppliers)}
          <p style="margin:16px 0 0;font-size:12px;color:#78716c">
            עסקי ניסיון ונגריות שנמחקו לא נספרים.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}

export type WeeklyReportResult =
  | { sent: true; key: string; counts: SignupCounts }
  | { sent: false; reason: 'not-report-hour' | 'already-sent' | 'no-log' | 'send-failed'; key?: string }

/**
 * Send the report if this is the hour for it. `force` skips the hour check and
 * the once-a-week claim, for a manual test run.
 */
export async function runWeeklyReport(now: Date = new Date(), { force = false } = {}): Promise<WeeklyReportResult> {
  if (!force && !isReportHour(now)) return { sent: false, reason: 'not-report-hour' }

  const key = reportKey(now)
  const supabase = getSupabaseAdmin()

  if (!force) {
    const { data, error } = await supabase
      .from('reminder_log')
      .upsert([{ key }], { onConflict: 'key', ignoreDuplicates: true })
      .select('key')
    if (error) {
      console.error('[weekly-report] claim failed', error)
      return { sent: false, reason: 'no-log', key }
    }
    if (!data || data.length === 0) return { sent: false, reason: 'already-sent', key }
  }

  const { from, to } = reportWindow(now)
  try {
    const week = await loadWeek(from, to)
    const result = await sendEmail({
      to: operatorEmail(),
      subject: reportSubject(week.counts),
      html: weeklyReportHtml(week, from, to),
    })
    if (!result.sent) throw new Error(result.error ?? result.reason ?? 'not sent')
    return { sent: true, key, counts: week.counts }
  } catch (err) {
    console.error('[weekly-report] failed', err)
    // Release the claim so a manual run (?force=1) or a later run that hour can try again.
    if (!force) await supabase.from('reminder_log').delete().eq('key', key)
    return { sent: false, reason: 'send-failed', key }
  }
}
