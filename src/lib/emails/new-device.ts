import 'server-only'

import { emailLogo } from './brand'

/**
 * "Someone just signed in to your account on a new device."
 *
 * Login links make the inbox the key to the account (T-020). This mail is how
 * the owner finds out when that key was used somewhere new: sent when an
 * emailed link is opened in a browser that held no session for that account.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function israelTime(): string {
  return new Date().toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A word a person recognises, not a user-agent string. */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? ''
  if (/iPhone|iPad/i.test(ua)) return 'אייפון / אייפד'
  if (/Android/i.test(ua)) return 'טלפון אנדרואיד'
  if (/Windows/i.test(ua)) return 'מחשב Windows'
  if (/Macintosh|Mac OS/i.test(ua)) return 'מחשב Mac'
  return 'מכשיר אחר'
}

export function newDeviceSubject(): string {
  return `כניסה חדשה לחשבון בשוק הנגרים · ${israelTime()}`
}

export function newDeviceHtml({ accountName, device }: { accountName: string; device: string }): string {
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 20px ${FONT}">נכנסו לחשבון ממכשיר חדש</div>
          <p style="margin:12px 0 0">החשבון של <strong>${escapeHtml(accountName)}</strong> נפתח עכשיו דרך קישור הכניסה מהמייל.</p>
          <p style="margin:8px 0 0">מכשיר: <strong>${escapeHtml(device)}</strong><br>זמן: <strong>${israelTime()}</strong></p>
          <p style="margin:14px 0 0">אם זה הייתם אתם, אין צורך לעשות כלום.</p>
          <p style="margin:6px 0 0"><strong>לא אתם?</strong> השיבו למייל הזה ונחסום את הגישה. כדאי גם להחליף את הסיסמה של תיבת המייל, כי מי שנכנס אליה יכול לבקש קישור כניסה.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}
