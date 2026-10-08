import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * "You have a new message" for either side of a thread (T-025).
 *
 * Carries a short preview and a link into the site, where the conversation
 * lives. Email is the only notification channel (owner, 2026-10-08).
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function newMessageSubject(fromName: string, subject: string): string {
  return `הודעה חדשה מ${fromName} · ${subject}`
}

export function newMessageHtml({ fromName, subject, body, path }: { fromName: string; subject: string; body: string; path: string }): string {
  const preview = body.length > 400 ? `${body.slice(0, 400)}…` : body
  const link = `${siteUrl()}${path}`
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 19px ${FONT}">הודעה חדשה מ${escapeHtml(fromName)}</div>
          <div style="margin-top:4px;color:#78716c;font-size:13px">${escapeHtml(subject)}</div>
          <p style="margin:12px 0 0;background:#fafaf9;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(preview)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
            <tr><td align="center">
              <a href="${link}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 16px ${FONT};padding:14px;border-radius:12px;text-align:center">לקריאה ולתשובה באתר</a>
            </td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#78716c">התשובה נכתבת באתר, לא בתשובה למייל הזה.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}
