import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * The three emails of נגרים עובדים ביחד (phase 3): a job that fits, an answer
 * to my job, a new message. Each links into the site, where the work and the
 * conversation live, and ends with a one-click way to stop them.
 */

const FONT = 'Arial,Helvetica,sans-serif'
const TEAL = '#0E5E5E'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function preview(text: string): string {
  return text.length > 300 ? `${text.slice(0, 300)}…` : text
}

function layout({ title, lines, quote, button, path, unsubscribe }: {
  title: string
  lines: string[]
  quote?: string
  button: string
  path: string
  unsubscribe: string
}): string {
  const link = `${siteUrl()}${path}`
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 12px ${FONT};color:${TEAL}">נגרים עובדים ביחד</div>
          <div style="margin-top:4px;font:bold 19px ${FONT}">${escapeHtml(title)}</div>
          ${lines.map((line) => `<div style="margin-top:4px;color:#57534e">${escapeHtml(line)}</div>`).join('')}
          ${quote ? `<p style="margin:12px 0 0;background:#fafaf9;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(preview(quote))}</p>` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
            <tr><td align="center">
              <a href="${link}" style="display:block;background:${TEAL};color:#ffffff;text-decoration:none;font:bold 16px ${FONT};padding:14px;border-radius:12px;text-align:center">${escapeHtml(button)}</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:12px 0 0;font-size:12px;color:#78716c;text-align:center">
        קיבלתם את המייל כי ביקשתם התראות מנגרים עובדים ביחד. עד 5 מיילים ביום.
        <a href="${unsubscribe}" style="color:#78716c">להפסקת ההתראות</a>
      </p>
    </td></tr>
  </table>
</div>`
}

export interface JobSummary {
  id: string
  typeName: string
  regionName: string
  quantity: string
  dueDate: string
  description: string
}

export function jobMatchSubject(job: JobSummary): string {
  return `עבודה חדשה שמתאימה לכם: ${job.typeName} · ${job.regionName}`
}

export function jobMatchHtml(job: JobSummary, unsubscribe: string): string {
  return layout({
    title: `${job.typeName} · ${job.quantity}`,
    lines: [`${job.regionName} · עד ${job.dueDate}`],
    quote: job.description,
    button: 'לפרטי העבודה',
    path: `/app/work/${job.id}`,
    unsubscribe,
  })
}

export function answerSubject(subject: string): string {
  return `נגרייה פנתה לעבודה שלכם · ${subject}`
}

export function answerHtml({ from, subject, body, conversationId }: { from: string; subject: string; body: string; conversationId: string }, unsubscribe: string): string {
  return layout({
    title: `${from} פנתה לעבודה שלכם`,
    lines: [subject],
    quote: body,
    button: 'לשיחה',
    path: `/app/work/messages/${conversationId}`,
    unsubscribe,
  })
}

export function messageSubject(from: string): string {
  return `הודעה חדשה מ${from} · נגרים עובדים ביחד`
}

export function messageHtml({ from, subject, body, conversationId }: { from: string; subject: string; body: string; conversationId: string }, unsubscribe: string): string {
  return layout({
    title: `הודעה חדשה מ${from}`,
    lines: [subject],
    quote: body || 'צורף קובץ.',
    button: 'לקריאה ולתשובה באתר',
    path: `/app/work/messages/${conversationId}`,
    unsubscribe,
  })
}
