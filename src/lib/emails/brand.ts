import 'server-only'

import { siteUrl } from '../email'
import { BILLING_STARTS_LABEL, planLabel, SUPPLIER_PLANS } from '../supplier-plans'

/**
 * The logo at the top of every email.
 *
 * A PNG, not SVG: Gmail and Outlook refuse SVG images. Width and height are set
 * in the tag so the layout does not jump while the image loads, and the alt text
 * carries the name for clients that block images until asked.
 */
export function emailLogo(): string {
  return `<img src="${siteUrl()}/brand/email-logo.png" width="220" height="56" alt="Nagarim · שוק הנגרים" style="display:block;margin:0 auto;border:0;outline:none;height:56px;width:220px">`
}

/**
 * What joining costs and who does what, sent to every new supplier (owner,
 * 2026-10-08: the terms go out by email at registration). Numbers come from
 * lib/supplier-plans.ts; the full text stays on /terms.
 */
export function supplierTermsBlock(): string {
  const rows = SUPPLIER_PLANS.map(
    (plan, i) =>
      `<tr><td style="padding:3px 0;color:#44403c">${planLabel(i)}</td><td style="padding:3px 0 3px 12px;font-weight:bold;white-space:nowrap">${plan.monthlyExclVat.toLocaleString('he-IL')} ₪ לחודש</td></tr>`
  ).join('')
  return `
    <div style="margin:16px 0 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;padding:12px;font-size:13px;color:#44403c">
      <strong style="display:block;color:#1c1917;font-size:14px">תנאי ההצטרפות בקצרה</strong>
      <p style="margin:6px 0 0">מנוי חודשי לפי מספר המוצרים שאתם מציגים באתר, לפני מע״מ:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:4px;font-size:13px">${rows}</table>
      <p style="margin:6px 0 0">החיוב מתחיל ב${BILLING_STARTS_LABEL} ונעשה מחוץ לאתר. אין עמלה על הזמנות.</p>
      <p style="margin:6px 0 0">אתם המוכרים: אתם מאשרים כל הזמנה, מספקים, קובעים את תנאי התשלום ומוציאים את החשבונית לנגרייה. אנחנו לא גובים כסף מהנגרייה.</p>
      <p style="margin:6px 0 0">התקנון המלא: <a href="${siteUrl()}/terms" style="color:#047857">${siteUrl().replace(/^https?:\/\//, '')}/terms</a></p>
    </div>`
}
