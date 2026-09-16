import 'server-only'

import { siteUrl } from '../email'
import { formatIls } from '../vat'
import { emailLogo } from './brand'

/**
 * The emails a carpenter gets: a way back in from another device, the order
 * they just sent, and the supplier's answer.
 *
 * Registration promises "לשם יישלח אישור על כל הזמנה", and until now nothing
 * was ever sent to a carpenter at all.
 */

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Israel time, "16.09 14:32" — keeps repeated mails from folding into one thread. */
function sentAt(): string {
  return new Date().toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shell(inner: string): string {
  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.6 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>
      <div style="text-align:center;padding-bottom:16px">${emailLogo()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:20px">${inner}</td></tr>
      </table>
    </td></tr>
  </table>
</div>`
}

function button(href: string, label: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
  <tr><td align="center">
    <a href="${href}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 17px ${FONT};padding:15px;border-radius:12px;text-align:center">${label}</a>
  </td></tr>
</table>`
}

// ---- login link ------------------------------------------------------------

export function carpenterLoginSubject(): string {
  return `קישור כניסה לשוק הנגרים · ${sentAt()}`
}

export function carpenterLoginHtml({ businessName, token }: { businessName: string; token: string }): string {
  const link = `${siteUrl()}/carpenter/enter/${token}`
  return shell(`
    <div style="font:bold 20px ${FONT}">כניסה לשוק הנגרים</div>
    <p style="margin:12px 0 0">ביקשתם קישור כניסה עבור <strong>${escapeHtml(businessName)}</strong>. הקישור מחבר את המכשיר שבו תפתחו אותו — טלפון או מחשב.</p>
    ${button(link, 'כניסה לאתר')}
    <p style="margin:12px 0 0;font-size:12px;color:#78716c">הכפתור לא מופיע? הקישור עצמו:<br>
      <a href="${link}" dir="ltr" style="color:#047857;word-break:break-all">${link}</a></p>
    <p style="margin:14px 0 0;font-size:13px;color:#78716c">לא ביקשתם? אפשר להתעלם — בלי ללחוץ שום דבר לא קורה.</p>`)
}

// ---- order sent ------------------------------------------------------------

export interface CarpenterOrderLine {
  name: string
  quantity: number
  lineTotal: number
  supplier: string
}

export function carpenterOrderSentSubject(orderNumber: string): string {
  return `ההזמנה נשלחה לספק · ${orderNumber}`
}

export function carpenterOrderSentHtml({
  businessName,
  orderNumber,
  lines,
  subtotal,
  paymentTerms,
}: {
  businessName: string
  orderNumber: string
  lines: CarpenterOrderLine[]
  subtotal: number
  paymentTerms: string | null
}): string {
  const suppliers = [...new Set(lines.map((line) => line.supplier))]
  const rows = lines
    .map(
      (line) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e7e5e4">${escapeHtml(line.name)}
          <div style="color:#78716c;font-size:12px">${line.quantity} יח׳${suppliers.length > 1 ? ` · ${escapeHtml(line.supplier)}` : ''}</div></td>
        <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:left;white-space:nowrap;font-weight:bold">${formatIls(line.lineTotal)}</td>
      </tr>`
    )
    .join('')

  return shell(`
    <div style="font:bold 20px ${FONT}">ההזמנה נשלחה</div>
    <p style="margin:8px 0 0">שלום ${escapeHtml(businessName)}, הזמנה <strong dir="ltr">${escapeHtml(orderNumber)}</strong> נשלחה ל${escapeHtml(suppliers.join(' ול'))}.
      נעדכן אתכם במייל כשהספק יאשר אותה.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font:14px ${FONT}">
      ${rows}
      <tr><td style="padding-top:10px;font-weight:bold">סה״כ ללא מע״מ</td>
        <td style="padding-top:10px;text-align:left;font:bold 18px ${FONT};white-space:nowrap">${formatIls(subtotal)}</td></tr>
    </table>
    ${paymentTerms ? `<p style="margin:10px 0 0;color:#57534e">תנאי תשלום מבוקשים: <strong>${escapeHtml(paymentTerms)}</strong></p>` : ''}
    ${button(`${siteUrl()}/carpenter/orders`, 'להזמנות שלי')}
    <p style="margin:14px 0 0;font-size:12px;color:#78716c">זו הזמנת רכש, לא חשבונית. הספק יאשר, יספק ויוציא לכם חשבונית ישירות.</p>`)
}

// ---- supplier's answer ------------------------------------------------------

export function carpenterOrderUpdateSubject(kind: 'confirmed' | 'shipped', orderNumber: string): string {
  return kind === 'confirmed' ? `הספק אישר את ההזמנה · ${orderNumber}` : `ההזמנה יצאה לאספקה · ${orderNumber}`
}

export function carpenterOrderUpdateHtml({
  kind,
  businessName,
  orderNumber,
  supplierName,
  supplierPhone,
  submitted,
  confirmed,
  note,
}: {
  kind: 'confirmed' | 'shipped'
  businessName: string
  orderNumber: string
  supplierName: string
  supplierPhone: string | null
  submitted: number
  confirmed: number | null
  note: string | null
}): string {
  const changed = kind === 'confirmed' && confirmed != null && Math.abs(confirmed - submitted) > 0.005

  return shell(`
    <div style="font:bold 20px ${FONT}">${kind === 'confirmed' ? 'ההזמנה אושרה' : 'ההזמנה בדרך'}</div>
    <p style="margin:8px 0 0">שלום ${escapeHtml(businessName)}, ${escapeHtml(supplierName)}
      ${kind === 'confirmed' ? 'אישר/ה את הזמנה' : 'שלח/ה לאספקה את הזמנה'} <strong dir="ltr">${escapeHtml(orderNumber)}</strong>.</p>
    ${
      kind === 'confirmed'
        ? `<div style="margin-top:14px;background:${changed ? '#fef3c7' : '#ecfdf5'};border-radius:10px;padding:12px">
            <div style="font-size:12px;color:#57534e">${changed ? 'הסכום שאושר שונה מההזמנה' : 'סכום מאושר'}</div>
            <div style="font:bold 20px ${FONT}">${formatIls(confirmed ?? submitted)} <span style="font-size:12px;font-weight:normal;color:#78716c">ללא מע״מ</span></div>
            ${changed ? `<div style="font-size:13px;color:#78716c;text-decoration:line-through">${formatIls(submitted)} בהזמנה</div>` : ''}
          </div>`
        : ''
    }
    ${note ? `<p style="margin:12px 0 0;background:#fafaf9;border-radius:8px;padding:10px"><strong>הערת הספק:</strong> ${escapeHtml(note)}</p>` : ''}
    ${supplierPhone ? `<p style="margin:12px 0 0">שאלות על האספקה או החשבונית — ישירות לספק: <a href="tel:${escapeHtml(supplierPhone)}" style="color:#047857;font-weight:bold" dir="ltr">${escapeHtml(supplierPhone)}</a></p>` : ''}
    ${button(`${siteUrl()}/carpenter/orders`, 'להזמנות שלי')}`)
}
