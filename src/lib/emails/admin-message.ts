import 'server-only'

import { emailLogo } from './brand'
import { OPERATOR } from '../terms'
import { bodyToHtml, escapeHtml } from '../admin-mail-rules'

/**
 * A message the operator wrote by hand in /admin (lib/admin-mail.ts). The text
 * is the operator's, kept as plain text; this only wraps it in the brand.
 *
 * An advertising mailing names the sender and how to refuse, as the law asks
 * of every advertising mail (lib/admin-mail-rules.ts).
 */

const FONT = 'Arial,Helvetica,sans-serif'

export interface AdminMessageEmail {
  /** "שלום <name>," above the text; left out when empty. */
  greetingName?: string | null
  body: string
  replyTo: string
  /** Only on advertising mail: the one-click refusal link, when there is one. */
  marketing?: { unsubscribeUrl: string | null } | null
}

export function adminMessageHtml(p: AdminMessageEmail): string {
  const greeting = p.greetingName ? `<p style="margin:0 0 12px">שלום ${escapeHtml(p.greetingName)},</p>` : ''
  const footer = p.marketing
    ? `קיבלתם את המייל כי הסכמתם לקבל עדכונים ומבצעים מנגרים B2B (nagarimb2b.com).<br>
        השולח: ${escapeHtml(OPERATOR.name)}, נגרים B2B<br>
        ${p.marketing.unsubscribeUrl ? `<a href="${escapeHtml(p.marketing.unsubscribeUrl)}" style="color:#78716c;font-weight:bold">להסרה מרשימת התפוצה</a><br>` : ''}
        אפשר גם להשיב למייל הזה עם המילה "הסר" · ${escapeHtml(p.replyTo)}`
    : `נשלח מצוות נגרים B2B (nagarimb2b.com). אפשר להשיב ישירות למייל הזה.`
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:15px/1.7 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <div dir="rtl" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:20px;text-align:right">
        ${greeting}${bodyToHtml(p.body)}
        <p style="margin:16px 0 0;color:#57534e">צוות נגרים B2B</p>
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:16px">
        ${footer}
      </div>
    </td></tr>
  </table>
</div>`
}
