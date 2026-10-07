import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * A carpenter's question to a supplier, from "שאלה לספק" in the agent chat.
 *
 * The platform only passes it on: the answer goes straight back to the
 * carpenter by phone, WhatsApp or a reply to this mail, the same way the deal
 * itself happens directly between them.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface SupplierQuestionEmail {
  carpenterName: string
  contactName: string | null
  phone: string | null
  city: string | null
  carpenterEmail: string | null
  productName: string | null
  question: string
}

export function supplierQuestionSubject(q: SupplierQuestionEmail): string {
  return q.productName ? `שאלה מ${q.carpenterName} על ${q.productName}` : `שאלה מ${q.carpenterName}`
}

function whatsapp(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `972${digits.slice(1)}`
  return digits.length >= 11 ? `https://wa.me/${digits}` : null
}

export function supplierQuestionHtml(q: SupplierQuestionEmail): string {
  const who = [q.contactName && escapeHtml(q.contactName), q.city && escapeHtml(q.city)].filter(Boolean).join(' · ')
  const wa = q.phone ? whatsapp(q.phone) : null
  const button = (href: string, label: string, colour: string) =>
    `<a href="${href}" style="display:inline-block;background:${colour};color:#ffffff;text-decoration:none;font:bold 15px ${FONT};padding:12px 18px;border-radius:10px;margin:4px">${label}</a>`

  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        ${emailLogo()}
        <div style="font:bold 22px ${FONT};color:#1c1917;padding-top:14px">שאלה מנגרייה</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:16px">
          <div style="font:bold 16px ${FONT}">${escapeHtml(q.carpenterName)}</div>
          ${who ? `<div style="color:#57534e;padding-top:2px">${who}</div>` : ''}
          ${q.productName ? `<div style="padding-top:10px;color:#57534e">על המוצר: <strong style="color:#1c1917">${escapeHtml(q.productName)}</strong></div>` : ''}
          <div style="margin-top:10px;background:#fafaf9;border-radius:8px;padding:12px;color:#1c1917;white-space:pre-wrap">${escapeHtml(q.question)}</div>
        </td></tr>
      </table>
      <div style="text-align:center;padding-top:16px">
        ${q.phone ? button(`tel:${escapeHtml(q.phone)}`, `להתקשר ${escapeHtml(q.phone)}`, '#1c1917') : ''}
        ${wa ? button(wa, 'וואטסאפ', '#047857') : ''}
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:14px;line-height:1.6">
        ${q.carpenterEmail ? 'אפשר גם להשיב למייל הזה, והתשובה תגיע ישירות לנגרייה.<br>' : ''}
        השאלה נשלחה דרך <a href="${siteUrl()}/supplier" style="color:#78716c">שוק הנגרים</a>, ומופיעה גם במסוף הספק.
      </div>
    </td></tr>
  </table>
</div>`
}
