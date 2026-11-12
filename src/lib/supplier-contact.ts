import { formatPhone, isMobilePhone, nationalPhone } from './phone'

/**
 * Which numbers a registered carpentry reaches a supplier on, from the product
 * and supplier pages (product review 2026-11-12: WhatsApp and a call are the
 * main action, the purchase order the other option).
 *
 * Safe in the browser: no imports beyond lib/phone, no secrets. The server
 * decides who gets the numbers at all (lib/supplier-contact-server.ts).
 */

export interface SupplierContact {
  /** For the call button; null when there is no number to call. */
  phone: string | null
  /** A mobile for the WhatsApp button; null when the supplier has none or chose none. */
  whatsapp: string | null
}

export interface ContactRow {
  contact_phone?: string | null
  whatsapp_phone?: string | null
  contact_confirmed_at?: string | null
}

/**
 * The numbers to show, or null when there is nothing to show.
 *
 * Only numbers the supplier entered for this in its console (owner,
 * 2026-11-12): WhatsApp is its choice. Never the business phone it registered
 * with. A supplier without them is reached as before, by a message in the site
 * (and its email).
 */
export function contactOf(row: ContactRow): SupplierContact | null {
  if (!row.contact_confirmed_at) return null
  const phone = nationalPhone(row.contact_phone)
  const whatsapp = isMobilePhone(row.whatsapp_phone) ? nationalPhone(row.whatsapp_phone) : null
  if (!phone && !whatsapp) return null
  return { phone: phone ? formatPhone(phone) : null, whatsapp: whatsapp ? formatPhone(whatsapp) : null }
}

/** Where the press happened, as stored in contact_clicks.source. */
export type ContactSource = 'product' | 'supplier'

function site(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nagarimb2b.com').replace(/\/$/, '')
}

/**
 * The prepared WhatsApp message (owner, 2026-11-12: "שלום, הגעתי מנגרים B2B
 * לגבי…"), with the page's link so the supplier sees which product.
 */
export function contactMessage(about: { productId: string; productName: string } | null): string {
  if (!about) return `שלום, הגעתי מנגרים B2B דרך עמוד הספק שלכם.`
  return `שלום, הגעתי מנגרים B2B לגבי ${about.productName}.\n${site()}/app/product/${about.productId}`
}
