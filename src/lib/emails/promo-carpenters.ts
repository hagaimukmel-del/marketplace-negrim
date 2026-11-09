import 'server-only'

import { emailLogo } from './brand'
import { OPERATOR } from '../terms'

/**
 * "מוצר השבוע" to the carpentries that agreed to offers by mail (owner,
 * 2026-11-09). Built by lib/promo-carpenters.ts; who gets it is in
 * lib/promo-carpenters-rules.ts.
 *
 * The footer names the sender and how to refuse, by link or by reply, as the
 * law asks of every advertising mail.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface PromoCarpentersEmail {
  productName: string
  supplierName: string
  brand: string | null
  imageUrl: string | null
  productUrl: string
  /** Only when the supplier asked for the price on the card. */
  priceText: string | null
  unsubscribeUrl: string
  /** The sender's address, for replies and refusals. */
  contactEmail: string
}

export function promoCarpentersHtml(p: PromoCarpentersEmail): string {
  const brand = p.brand && !p.productName.includes(p.brand) ? ` · ${escapeHtml(p.brand)}` : ''
  const image = p.imageUrl
    ? `<div style="text-align:center;padding-bottom:12px">
        <a href="${escapeHtml(p.productUrl)}"><img src="${escapeHtml(p.imageUrl)}" width="280" alt="${escapeHtml(p.productName)}" style="max-width:100%;border-radius:10px"></a>
      </div>`
    : ''
  const price = p.priceText
    ? `<div style="font:bold 18px ${FONT};padding-top:8px">${escapeHtml(p.priceText)} <span style="font:13px ${FONT};color:#57534e">לפני מע״מ</span></div>`
    : ''
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:12px">
        ${emailLogo()}
        <div style="font:bold 22px ${FONT};color:#1c1917;padding-top:14px">מוצר השבוע</div>
      </div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:16px">
        ${image}
        <div style="font:bold 17px ${FONT}">${escapeHtml(p.productName)}</div>
        <div style="color:#57534e">${escapeHtml(p.supplierName)}${brand}</div>
        ${price}
        <div style="padding-top:10px;color:#44403c">מזמינים ישירות מהספק דרך האתר. הספק מאשר, מספק ומוציא לכם חשבונית.</div>
        <div style="text-align:center;padding-top:16px">
          <a href="${escapeHtml(p.productUrl)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font:bold 15px ${FONT};padding:12px 18px;border-radius:10px">לפרטים ולהזמנה</a>
        </div>
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:16px">
        קיבלתם את המייל כי הסכמתם לקבל מבצעים ועדכונים מנגרים B2B (nagarimb2b.com).<br>
        השולח: ${escapeHtml(OPERATOR.name)}, נגרים B2B<br>
        <a href="${escapeHtml(p.unsubscribeUrl)}" style="color:#78716c;font-weight:bold">להסרה מרשימת התפוצה</a><br>
        אפשר גם להשיב למייל הזה עם המילה "הסר" · ${escapeHtml(p.contactEmail)}
      </div>
    </td></tr>
  </table>
</div>`
}
