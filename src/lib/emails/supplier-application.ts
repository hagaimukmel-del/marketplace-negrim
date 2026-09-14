import 'server-only'

import { siteUrl } from '../email'

/**
 * The two messages a supplier application should produce, and until now did
 * not: an acknowledgement to whoever applied, and a nudge to the operator.
 *
 * Registering and hearing nothing reads as a form that swallowed your details.
 * A supplier is a business deciding whether to trust a marketplace with their
 * price list; silence at the first interaction is an expensive answer.
 *
 * Tables and inline styles, because that is what mail clients render.
 */

const FONT = 'Arial,Helvetica,sans-serif'

export interface SupplierApplication {
  companyName: string
  businessId: string
  contactName: string | null
  phone: string | null
  email: string | null
  city: string | null
  sellsNote: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(inner: string): string {
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        <div style="font:bold 15px ${FONT};color:#78716c">שוק הנגרים</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">${inner}</td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}

/** To the applicant. Says what happens next and does not promise a date. */
export function applicationReceivedSubject(): string {
  return 'קיבלנו את בקשת ההצטרפות שלכם — שוק הנגרים'
}

export function applicationReceivedHtml(application: SupplierApplication): string {
  return shell(`
    <div style="font:bold 20px ${FONT}">הבקשה שלכם התקבלה</div>
    <p style="margin:12px 0 0">
      שלום${application.contactName ? ' ' + escapeHtml(application.contactName) : ''}, קיבלנו את
      בקשת ההצטרפות של <strong>${escapeHtml(application.companyName)}</strong>.
    </p>
    <p style="margin:12px 0 0;color:#57534e">
      כל ספק מאושר ידנית לפני שהמוצרים שלו עולים לקטלוג. נעבור על הפרטים ונחזור אליכם —
      אם משהו חסר, נתקשר.
    </p>
    <p style="margin:16px 0 0;color:#57534e">
      תזכורת למה שמצפה לכם: אתם מספקים, אתם מוציאים את החשבונית ואתם קובעים את תנאי התשלום.
      אנחנו לא גובים כסף מהנגר.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#78716c">
      אפשר להשיב למייל הזה בכל שאלה.
    </p>`)
}

/** To the operator. Everything needed to decide, without opening the console. */
export function newApplicationSubject(application: SupplierApplication): string {
  return `ספק חדש נרשם: ${application.companyName}`
}

export function newApplicationHtml(application: SupplierApplication): string {
  const row = (label: string, value: string | null) =>
    value
      ? `<tr>
           <td style="padding:4px 0;color:#78716c;white-space:nowrap">${label}</td>
           <td style="padding:4px 0 4px 12px;font-weight:bold">${escapeHtml(value)}</td>
         </tr>`
      : ''

  return shell(`
    <div style="font:bold 20px ${FONT}">ספק חדש ממתין לאישור</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;font:14px ${FONT}">
      ${row('חברה', application.companyName)}
      ${row('ח.פ', application.businessId)}
      ${row('איש קשר', application.contactName)}
      ${row('טלפון', application.phone)}
      ${row('מייל', application.email)}
      ${row('עיר', application.city)}
    </table>
    ${
      application.sellsNote
        ? `<p style="margin:14px 0 0;background:#fafaf9;border-radius:8px;padding:12px;color:#44403c">
             <strong style="display:block;color:#78716c;font-size:12px">מה הם מוכרים</strong>
             ${escapeHtml(application.sellsNote)}
           </p>`
        : ''
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
      <tr><td align="center">
        <a href="${siteUrl()}/admin/suppliers" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 16px ${FONT};padding:14px;border-radius:10px;text-align:center">
          למסך הספקים
        </a>
      </td></tr>
    </table>`)
}
