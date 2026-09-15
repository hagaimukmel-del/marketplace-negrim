import 'server-only'

import { siteUrl } from '../email'

/**
 * The message a raffle winner gets.
 *
 * Plain on purpose: a prize email that looks like a campaign reads as spam, and
 * one that looks like a note from a person gets opened. The prize text is
 * whatever the operator typed; without one, it says the details are coming.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function raffleWinSubject(): string {
  return 'זכיתם בהגרלה של שוק הנגרים'
}

export function raffleWinHtml({
  winnerName,
  prize,
}: {
  winnerName: string
  prize: string | null
}): string {
  const catalog = `${siteUrl()}/carpenter/catalog`

  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        <div style="font:bold 15px ${FONT};color:#78716c">שוק הנגרים</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:22px">
          <div style="font:bold 22px ${FONT}">מזל טוב, ${escapeHtml(winnerName)}!</div>
          <p style="margin:12px 0 0">
            עלית בהגרלה שערכנו בין הנגריות הרשומות בשוק הנגרים.
          </p>
          <div style="margin-top:16px;background:#ecfdf5;border-radius:10px;padding:14px">
            <div style="font-size:12px;color:#065f46">הפרס</div>
            <div style="font:bold 17px ${FONT};color:#064e3b;margin-top:2px">
              ${prize ? escapeHtml(prize) : 'נחזור אליכם בימים הקרובים עם כל הפרטים'}
            </div>
          </div>
          <p style="margin:16px 0 0">
            ניצור איתכם קשר לתיאום. אפשר גם פשוט להשיב למייל הזה.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
            <tr><td align="center">
              <a href="${catalog}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 16px ${FONT};padding:14px;border-radius:12px;text-align:center">
                לקטלוג
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#a8a29e">
            ההשתתפות בהגרלה אינה כרוכה בתשלום או ברכישה. בכפוף לתקנון האתר.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}
