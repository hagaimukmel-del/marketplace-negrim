import 'server-only'

import { formatIls } from '../vat'
import { confirmUrl } from '../supplier-link'
import { siteUrl } from '../email'

/**
 * The one email the marketplace sends.
 *
 * Written as tables with inline styles, because that is what mail clients
 * actually render — Outlook has no flexbox and Gmail strips a <style> block.
 * Every colour and size is inline for the same reason.
 *
 * The confirm button carries the signed link, so a supplier with no account can
 * answer in one tap from their phone. That is the entire point of the email:
 * not to inform, but to get an answer.
 */

export interface NewOrderLine {
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
}

export interface NewOrderEmail {
  orderId: string
  supplierId: string
  orderNumber: string
  carpenterName: string
  contactName: string | null
  phone: string | null
  city: string | null
  address: string | null
  paymentTerms: string | null
  notes: string | null
  lines: NewOrderLine[]
  subtotalExclVat: number
}

const FONT = 'Arial,Helvetica,sans-serif'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(line: NewOrderLine): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;font:14px/1.4 ${FONT};color:#1c1917">
        ${escapeHtml(line.product_name_he)}
        <div style="color:#78716c;font-size:13px;margin-top:2px">
          ${line.quantity} × ${formatIls(line.unit_price_excl_vat)}
        </div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;font:bold 14px ${FONT};color:#1c1917;text-align:left;white-space:nowrap">
        ${formatIls(line.line_total_excl_vat)}
      </td>
    </tr>`
}

export function newOrderSubject(order: NewOrderEmail): string {
  return `הזמנה חדשה מ${order.carpenterName} — ${formatIls(order.subtotalExclVat)}`
}

export function newOrderHtml(
  order: NewOrderEmail,
  { canConfirm = true }: { canConfirm?: boolean } = {}
): string {
  const link = confirmUrl(order.orderId, order.supplierId, siteUrl())

  const contact = [
    order.contactName && escapeHtml(order.contactName),
    order.phone && `<a href="tel:${escapeHtml(order.phone)}" style="color:#1c1917">${escapeHtml(order.phone)}</a>`,
    [order.address, order.city].filter(Boolean).map((part) => escapeHtml(part!)).join(', ') || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `
<div dir="rtl" style="background:#fafaf9;padding:24px 12px;font:14px/1.5 ${FONT};color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td>

      <div style="text-align:center;padding-bottom:16px">
        <div style="font:bold 15px ${FONT};color:#78716c">שוק הנגרים</div>
        <div style="font:bold 24px ${FONT};color:#1c1917;padding-top:6px">הזמנה חדשה</div>
        <div style="font:13px ${FONT};color:#78716c;padding-top:4px">${escapeHtml(order.orderNumber)}</div>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:16px">
          <div style="font:bold 16px ${FONT};color:#1c1917">${escapeHtml(order.carpenterName)}</div>
          ${contact ? `<div style="color:#57534e;padding-top:4px">${contact}</div>` : ''}
          ${
            order.paymentTerms
              ? `<div style="padding-top:8px;color:#57534e">תנאי תשלום מבוקשים: <strong style="color:#1c1917">${escapeHtml(order.paymentTerms)}</strong></div>`
              : ''
          }
          ${
            order.notes
              ? `<div style="margin-top:10px;background:#fafaf9;border-radius:8px;padding:10px;color:#44403c">${escapeHtml(order.notes)}</div>`
              : ''
          }
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;margin-top:12px">
        <tr><td style="padding:4px 16px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${order.lines.map(row).join('')}
            <tr>
              <td style="padding-top:12px;font:bold 15px ${FONT}">סה״כ ללא מע״מ</td>
              <td style="padding-top:12px;font:bold 20px ${FONT};text-align:left;white-space:nowrap">
                ${formatIls(order.subtotalExclVat)}
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${
        canConfirm
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
        <tr><td align="center">
          <a href="${link}" style="display:block;background:#047857;color:#ffffff;text-decoration:none;font:bold 17px ${FONT};padding:16px;border-radius:12px;text-align:center">
            אשר הזמנה
          </a>
        </td></tr>
      </table>

      <div style="text-align:center;color:#78716c;font-size:12px;padding-top:14px;line-height:1.6">
        אישור מודיע לנגר שההזמנה בטיפול.<br>
        האספקה והחשבונית ישירות ממכם אליו, לפי התנאים שסיכמתם.
      </div>`
          : `<div style="text-align:center;color:#78716c;font-size:13px;padding-top:16px;line-height:1.6">
        ההזמנה כוללת גם ספקים אחרים, ולכן היא מאושרת מולנו. ניצור קשר.
      </div>`
      }

    </td></tr>
  </table>
</div>`
}
