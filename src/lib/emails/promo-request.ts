import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * "מוצר השבוע" requests by mail (T-024): the operator hears about a supplier's
 * booking as it happens instead of finding it in /admin/promotions later.
 * The address is the owner's (2026-10-11), not ADMIN_EMAIL, which is only for
 * new supplier applications.
 */

export const PROMO_REQUEST_EMAIL = 'nagarim.b2b@gmail.com'

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface PromoRequestEmail {
  supplierName: string
  contactName: string | null
  phone: string | null
  productName: string
  weekText: string
  priceText: string
  /** The supplier wants their price on the card. */
  showPrice: boolean
}

export function promoRequestSubject(p: PromoRequestEmail): string {
  return `בקשת מוצר השבוע מ${p.supplierName}: ${p.weekText}`
}

export function promoRequestHtml(p: PromoRequestEmail): string {
  const who = [p.contactName, p.phone].filter((v): v is string => Boolean(v)).map(escapeHtml).join(' · ')
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        ${emailLogo()}
        <div style="font:bold 22px ${FONT};color:#1c1917;padding-top:14px">בקשה לפרסום מוצר השבוע</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:16px">
          <div style="font:bold 16px ${FONT}">${escapeHtml(p.supplierName)}</div>
          ${who ? `<div style="color:#57534e;padding-top:2px">${who}</div>` : ''}
          <div style="padding-top:10px">מוצר: <strong>${escapeHtml(p.productName)}</strong></div>
          <div>שבוע: <strong>${escapeHtml(p.weekText)}</strong></div>
          <div>מחיר הפרסום: <strong>${escapeHtml(p.priceText)}</strong> לפני מע״מ</div>
          <div>מחיר המוצר בפרסומת: <strong>${p.showPrice ? 'מוצג' : 'לא מוצג'}</strong></div>
        </td></tr>
      </table>
      <div style="text-align:center;padding-top:16px">
        <a href="${siteUrl()}/admin/promotions" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font:bold 15px ${FONT};padding:12px 18px;border-radius:10px">לאשר או לדחות</a>
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:14px">המוצר מקודם רק אחרי אישור. התשלום על הפרסום נעשה מחוץ לאתר.</div>
    </td></tr>
  </table>
</div>`
}
