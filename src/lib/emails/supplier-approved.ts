import 'server-only'

import { siteUrl } from '../email'

/**
 * The message that turns an approval into access.
 *
 * Approving a supplier and telling nobody leaves them exactly where they were.
 * This carries the one link that opens their console — and because that link is
 * the whole credential, it says so plainly rather than leaving them to guess
 * how much care it deserves.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function supplierApprovedSubject(): string {
  return 'אושרתם כספק בשוק הנגרים — הכניסה שלכם'
}

export function supplierApprovedHtml({
  companyName,
  contactName,
  token,
}: {
  companyName: string
  contactName: string | null
  token: string
}): string {
  const link = `${siteUrl()}/supplier/enter/${token}`

  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        <div style="font:bold 15px ${FONT};color:#78716c">שוק הנגרים</div>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">
          <div style="font:bold 20px ${FONT}">${escapeHtml(companyName)} אושרה</div>
          <p style="margin:12px 0 0">
            שלום${contactName ? ' ' + escapeHtml(contactName) : ''}, אישרנו את ההצטרפות שלכם.
            הקישור הבא פותח את הממשק שלכם — ההזמנות שמחכות לכם, והמחירים שאתם שולטים בהם.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
            <tr><td align="center">
              <a href="${link}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 17px ${FONT};padding:16px;border-radius:12px;text-align:center">
                כניסה לממשק הספק
              </a>
            </td></tr>
          </table>

          <p style="margin:16px 0 0;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;color:#78350f;font-size:13px">
            <strong>הקישור הזה הוא הכניסה שלכם.</strong> אין סיסמה לשחזר, אז שמרו אותו
            במועדפים ואל תעבירו הלאה — מי שמחזיק בו יכול לשנות את המחירים שלכם.
            אם הוא הודלף, כתבו לנו ונחליף אותו.
          </p>

          <p style="margin:16px 0 0;color:#57534e;font-size:13px">
            תזכורת: אתם מספקים, אתם מוציאים את החשבונית לנגר ואתם קובעים את תנאי התשלום.
            אנחנו לא גובים כסף מהנגר.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}
