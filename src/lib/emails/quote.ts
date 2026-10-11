import 'server-only'

import { siteUrl } from '../email'
import { emailLogo } from './brand'

/**
 * Quote requests by mail (T-023): the request to the supplier, and the answer
 * back to the carpentry. Both point into the site, where the request is
 * answered and the quote is added to the cart. A quote is a price offer from
 * the supplier, never an invoice.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function frame(title: string, body: string, button: { href: string; label: string }, footer: string): string {
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">
        ${emailLogo()}
        <div style="font:bold 22px ${FONT};color:#1c1917;padding-top:14px">${title}</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:16px">${body}</td></tr>
      </table>
      <div style="text-align:center;padding-top:16px">
        <a href="${button.href}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font:bold 15px ${FONT};padding:12px 18px;border-radius:10px">${button.label}</a>
      </div>
      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:14px;line-height:1.6">${footer}</div>
    </td></tr>
  </table>
</div>`
}

export interface QuoteRequestEmail {
  carpenterName: string
  contactName: string | null
  city: string | null
  productName: string
  quantityText: string
  note: string | null
}

export function quoteRequestSubject(q: QuoteRequestEmail): string {
  return `בקשת הצעת מחיר מ${q.carpenterName}: ${q.productName}`
}

export function quoteRequestHtml(q: QuoteRequestEmail): string {
  const who = [q.contactName && escapeHtml(q.contactName), q.city && escapeHtml(q.city)].filter(Boolean).join(' · ')
  return frame(
    'בקשת הצעת מחיר',
    `<div style="font:bold 16px ${FONT}">${escapeHtml(q.carpenterName)}</div>
     ${who ? `<div style="color:#57534e;padding-top:2px">${who}</div>` : ''}
     <div style="padding-top:10px">${escapeHtml(q.productName)}</div>
     <div style="color:#57534e">כמות: <strong style="color:#1c1917">${escapeHtml(q.quantityText)}</strong></div>
     ${q.note ? `<div style="margin-top:10px;background:#fafaf9;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(q.note)}</div>` : ''}`,
    { href: `${siteUrl()}/supplier?tab=orders`, label: 'לענות עם מחיר' },
    'עונים באתר במחיר ליחידה ללא מע״מ ועד מתי הוא בתוקף. הנגרייה מקבלת את ההצעה ויכולה להזמין לפיה.'
  )
}

export interface QuoteAnswerEmail {
  supplierName: string
  productName: string
  quantityText: string
  /** Null when the supplier declined. */
  unitPriceText: string | null
  totalText: string | null
  validUntilText: string | null
  supplierNote: string | null
}

export function quoteAnswerSubject(q: QuoteAnswerEmail): string {
  return q.unitPriceText ? `הצעת מחיר מ${q.supplierName}: ${q.productName}` : `${q.supplierName} לא הציע מחיר ל${q.productName}`
}

export function quoteAnswerHtml(q: QuoteAnswerEmail): string {
  const priced = q.unitPriceText
    ? `<div style="padding-top:10px">מחיר: <strong>${escapeHtml(q.unitPriceText)}</strong> לפני מע״מ</div>
       ${q.totalText ? `<div>סה״כ לכמות: <strong>${escapeHtml(q.totalText)}</strong> לפני מע״מ</div>` : ''}
       ${q.validUntilText ? `<div style="color:#57534e">בתוקף עד ${escapeHtml(q.validUntilText)}</div>` : ''}`
    : `<div style="padding-top:10px;color:#57534e">הספק לא יכול להציע מחיר לבקשה הזו.</div>`
  return frame(
    q.unitPriceText ? 'קיבלת הצעת מחיר' : 'תשובה לבקשת הצעת מחיר',
    `<div style="font:bold 16px ${FONT}">${escapeHtml(q.supplierName)}</div>
     <div style="padding-top:6px">${escapeHtml(q.productName)} · ${escapeHtml(q.quantityText)}</div>
     ${priced}
     ${q.supplierNote ? `<div style="margin-top:10px;background:#fafaf9;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(q.supplierNote)}</div>` : ''}`,
    { href: `${siteUrl()}/app/quotes`, label: q.unitPriceText ? 'להוסיף להזמנה' : 'להצעות המחיר שלי' },
    'זו הצעת מחיר מהספק, לא חשבונית. ההזמנה יוצאת רק כשאתם שולחים אותה, והספק מוציא חשבונית ישירות אליכם.'
  )
}
