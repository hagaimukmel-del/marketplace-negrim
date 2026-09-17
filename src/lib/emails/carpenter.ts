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

export function carpenterOrderSentSubject(orderNumbers: string[]): string {
  return orderNumbers.length > 1
    ? `${orderNumbers.length} הזמנות רכש נשלחו לספקים · ${orderNumbers[0].replace(/-\d+$/, '')}`
    : `ההזמנה נשלחה לספק · ${orderNumbers[0]}`
}

export interface CarpenterSentOrder {
  orderNumber: string
  supplier: string
  lines: CarpenterOrderLine[]
  subtotal: number
}

export function carpenterOrderSentHtml({
  businessName,
  orders,
  paymentTerms,
}: {
  businessName: string
  /** One purchase order per supplier, from the same checkout. */
  orders: CarpenterSentOrder[]
  paymentTerms: string | null
}): string {
  const many = orders.length > 1
  const blocks = orders
    .map((order) => {
      const rows = order.lines
        .map(
          (line) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e7e5e4">${escapeHtml(line.name)}
          <div style="color:#78716c;font-size:12px">${line.quantity} יח׳</div></td>
        <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:left;white-space:nowrap;font-weight:bold">${formatIls(line.lineTotal)}</td>
      </tr>`
        )
        .join('')
      return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;font:14px ${FONT}">
      <tr><td colspan="2" style="padding-bottom:4px">
        <strong>${escapeHtml(order.supplier)}</strong>
        <span style="color:#78716c;font-size:12px" dir="ltr"> · ${escapeHtml(order.orderNumber)}</span></td></tr>
      ${rows}
      <tr><td style="padding-top:8px;font-weight:bold">סה״כ ${many ? 'לספק ' : ''}ללא מע״מ</td>
        <td style="padding-top:8px;text-align:left;font:bold 16px ${FONT};white-space:nowrap">${formatIls(order.subtotal)}</td></tr>
    </table>`
    })
    .join('')
  const total = orders.reduce((sum, order) => sum + order.subtotal, 0)

  return shell(`
    <div style="font:bold 20px ${FONT}">${many ? `נשלחו ${orders.length} הזמנות רכש` : 'ההזמנה נשלחה'}</div>
    <p style="margin:8px 0 0">שלום ${escapeHtml(businessName)}, ${
      many
        ? `ההזמנה פוצלה להזמנת רכש נפרדת לכל ספק: ${escapeHtml(orders.map((order) => order.supplier).join(', '))}. כל ספק מאשר את שלו.`
        : `הזמנה <strong dir="ltr">${escapeHtml(orders[0].orderNumber)}</strong> נשלחה ל${escapeHtml(orders[0].supplier)}.`
    }
      נעדכן אתכם במייל כשהספק יאשר.</p>
    ${blocks}
    ${many ? `<p style="margin:14px 0 0;font:bold 15px ${FONT}">סה״כ כל ההזמנות ללא מע״מ: ${formatIls(Number(total.toFixed(2)))}</p>` : ''}
    ${paymentTerms ? `<p style="margin:10px 0 0;color:#57534e">תנאי תשלום מבוקשים: <strong>${escapeHtml(paymentTerms)}</strong></p>` : ''}
    ${button(`${siteUrl()}/carpenter/orders`, 'להזמנות שלי')}
    <p style="margin:14px 0 0;font-size:12px;color:#78716c">${many ? 'אלה הזמנות רכש, לא חשבוניות. כל ספק יאשר, יספק ויוציא לכם חשבונית ישירות.' : 'זו הזמנת רכש, לא חשבונית. הספק יאשר, יספק ויוציא לכם חשבונית ישירות.'}</p>`)
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
