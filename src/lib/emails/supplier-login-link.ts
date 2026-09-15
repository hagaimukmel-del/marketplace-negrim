import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * A fresh copy of the way in, for a supplier who lost it.
 *
 * Sent only to the address already on file — never shown on screen — so asking
 * for it proves nothing beyond owning that mailbox, which is the same trust the
 * original approval email already placed there.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Israel time, "15.09 14:32" — makes each copy of this mail distinct. */
function sentAt(): string {
  return new Date().toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Stamped with the time, because this mail is asked for repeatedly and each copy
 * is identical. Gmail threads identical messages and folds the repeated body
 * behind "•••" — button included — so a supplier asking a second time got what
 * looked like an email with no way in.
 */
export function supplierLoginLinkSubject(): string {
  return `קישור כניסה לשוק הנגרים · ${sentAt()}`
}

export function supplierLoginLinkHtml({
  companyName,
  token,
}: {
  companyName: string
  token: string
}): string {
  const link = `${siteUrl()}/supplier/enter/${token}`

  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        ${emailLogo()}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 20px ${FONT}">כניסה לממשק הספק</div>
          <p style="margin:12px 0 0">
            ביקשתם קישור כניסה עבור <strong>${escapeHtml(companyName)}</strong> · ${sentAt()}.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
            <tr><td align="center">
              <a href="${link}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 17px ${FONT};padding:16px;border-radius:12px;text-align:center">
                כניסה לממשק הספק
              </a>
            </td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#78716c">
            הכפתור לא מופיע? הקישור עצמו:<br>
            <a href="${link}" dir="ltr" style="color:#047857;word-break:break-all">${link}</a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;color:#78716c">
            לא ביקשתם? אפשר להתעלם מהמייל — בלי ללחוץ על הקישור שום דבר לא קורה.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}
