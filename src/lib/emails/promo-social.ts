import 'server-only'

import { emailLogo } from './brand'

/**
 * "מוצר השבוע שלכם" by mail (owner, 2026-11-09): the week's promoted product
 * with ready-to-paste social posts, to the owner every Sunday morning. Built by
 * lib/promo-social.ts; the texts come from lib/promo-social-rules.ts.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Line breaks kept, so the text pastes as it reads. */
function block(title: string, text: string): string {
  return `
      <div style="font:bold 14px ${FONT};padding:16px 0 6px">${title}</div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:10px;padding:12px;white-space:pre-wrap">${escapeHtml(text)}</div>`
}

export interface PromoSocialEmail {
  productName: string
  supplierName: string
  weekText: string
  imageUrl: string | null
  productUrl: string
  shortPost: string
  longPost: string
}

export function promoSocialSubject(p: PromoSocialEmail): string {
  return `מוצר השבוע שלכם לרשתות: ${p.productName} (${p.weekText})`
}

export function promoSocialHtml(p: PromoSocialEmail): string {
  const image = p.imageUrl
    ? `<div style="text-align:center;padding-top:12px">
        <a href="${escapeHtml(p.imageUrl)}"><img src="${escapeHtml(p.imageUrl)}" width="280" alt="${escapeHtml(p.productName)}" style="max-width:100%;border:1px solid #e7e5e4;border-radius:10px"></a>
        <div style="padding-top:6px"><a href="${escapeHtml(p.imageUrl)}" style="color:#047857">לפתוח את התמונה בגודל מלא להורדה</a></div>
      </div>`
    : `<div style="padding-top:12px;color:#78716c">למוצר אין תמונה באתר. כדאי לבקש תמונה מהספק.</div>`
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:12px">
        ${emailLogo()}
        <div style="font:bold 22px ${FONT};color:#1c1917;padding-top:14px">מוצר השבוע שלכם</div>
        <div style="color:#57534e">שבוע ${escapeHtml(p.weekText)} · פוסט מוכן לרשתות</div>
      </div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:16px">
        <div style="font:bold 17px ${FONT}">${escapeHtml(p.productName)}</div>
        <div style="color:#57534e">${escapeHtml(p.supplierName)}</div>
        ${image}
      </div>
      ${block('אינסטגרם וסטורי', p.shortPost)}
      ${block('פייסבוק ווואטסאפ', p.longPost)}
      <div style="text-align:center;padding-top:16px">
        <a href="${escapeHtml(p.productUrl)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font:bold 15px ${FONT};padding:12px 18px;border-radius:10px">לעמוד המוצר באתר</a>
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:14px">נשלח בכל יום ראשון בבוקר על מוצר השבוע המאושר. המייל לא מפרסם בעצמו ברשתות.</div>
    </td></tr>
  </table>
</div>`
}
