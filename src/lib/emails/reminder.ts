import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * The supplier's reminders (communication plan, step 5): one item still
 * waiting, or the morning summary of everything waiting. Short, one button,
 * the work itself happens on the site (or through the signed confirm link).
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function frame(inner: string): string {
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">${inner}</td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
    <tr><td align="center">
      <a href="${escapeHtml(href)}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 16px ${FONT};padding:14px;border-radius:12px;text-align:center">${escapeHtml(label)}</a>
    </td></tr>
  </table>`
}

export function reminderHtml({ title, body, href, action }: { title: string; body: string; href: string; action: string }): string {
  return frame(`
    <div style="font:bold 19px ${FONT}">${escapeHtml(title)}</div>
    <p style="margin:10px 0 0;color:#44403c">${escapeHtml(body)}</p>
    ${button(href, action)}
    <p style="margin:12px 0 0;font-size:12px;color:#78716c">הנגרייה רואה באתר מתי ענית. אם יש בעיה, אפשר לכתוב לה בשיחה שבאתר.</p>
  `)
}

export interface DailySummary {
  supplierName: string
  orders: number
  quotes: number
  messages: number
}

export function dailySummarySubject(s: DailySummary): string {
  const parts = [
    s.orders ? `${s.orders} הזמנות לאישור` : null,
    s.quotes ? `${s.quotes} בקשות הצעת מחיר` : null,
    s.messages ? `${s.messages} הודעות שמחכות לתשובה` : null,
  ].filter(Boolean)
  return `מחכה לך בנגרים B2B: ${parts.join(', ')}`
}

export function dailySummaryHtml(s: DailySummary): string {
  const row = (count: number, label: string) =>
    count
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e7e5e4">${escapeHtml(label)}</td><td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:left;font-weight:bold">${count}</td></tr>`
      : ''
  return frame(`
    <div style="font:bold 19px ${FONT}">בוקר טוב, ${escapeHtml(s.supplierName)}</div>
    <p style="margin:6px 0 0;color:#57534e">זה מה שמחכה לך היום באתר:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
      ${row(s.orders, 'הזמנות שמחכות לאישור')}
      ${row(s.quotes, 'בקשות להצעת מחיר')}
      ${row(s.messages, 'הודעות מנגריות שמחכות לתשובה')}
    </table>
    ${button(`${siteUrl()}/supplier?tab=orders`, 'לכניסה למערכת הספק')}
  `)
}
