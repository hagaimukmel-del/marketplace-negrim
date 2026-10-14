/**
 * The shapes the supplier app passes around, and the two small helpers every
 * tab uses. Kept free of server-only imports so both the page and the client
 * tabs can read it.
 */

import type { PromoWeek } from '@/lib/promo-weeks'
import type { SupplierQuoteRequest } from '@/lib/quotes'

export type Tab = 'orders' | 'products' | 'sales' | 'promo' | 'business' | 'terms' | 'documents'

export const TABS: readonly Tab[] = ['orders', 'products', 'sales', 'promo', 'business', 'terms', 'documents']

export function isTab(value: unknown): value is Tab {
  return typeof value === 'string' && (TABS as readonly string[]).includes(value)
}

/**
 * The terms a supplier can offer. A fixed list, because free text would never
 * be comparable across suppliers, and a carpenter choosing between two of them
 * needs the same words on both.
 */
export const PAYMENT_TERMS = [
  'שוטף+30',
  'שוטף+60',
  'שוטף+90',
  'מזומן במסירה',
  'העברה מראש',
] as const

export interface SupplierProfile {
  id: string
  company_name: string
  business_id: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  pickup_address: string | null
  sells_note: string | null
  logo_url: string | null
  min_order_value_excl_vat: number | null
  default_lead_time_days: number | null
  payment_terms: string[]
  /** False on a database without migration 20261008130000; the regions form waits for it. */
  delivery_ready: boolean
  delivery_regions: string[]
  delivery_fee_excl_vat: number | null
  free_delivery_from_excl_vat: number | null
  /** False on a database without migration 20261011120000; the copies field waits for it. */
  order_cc_ready: boolean
  /** Who else gets a copy of each new order (warehouse, bookkeeping). */
  order_cc_emails: string[]
  /** "להציג מחירים / רק הצעת מחיר" (T-023); null on a database without migration 20261011140000. */
  price_mode: 'shown' | 'quote' | null
}

export interface ProductItem {
  offerId: string
  productId: string
  name: string
  nameEn: string | null
  description: string | null
  categoryId: string | null
  categoryName: string | null
  brand: string | null
  mpn: string | null
  baseUnit: string
  imageUrl: string | null
  price: number
  stock: number
  sku: string | null
  packLabel: string | null
  packQty: number | null
  minOrderQty: number
  /** Special price for quantity from this many base units; null = none (stage 1 RFQ rules). */
  specialMinQty: number | null
  /** The pack size the threshold was set for; when it differs from packQty the threshold waits for confirmation. */
  specialPackQty: number | null
  isActive: boolean
  /** Only the supplier who created a product may change what is shared. */
  canEditProduct: boolean
  /** This supplier attached at least one technical sheet or guide to it. */
  hasSheet: boolean
}

/**
 * A product already in the catalogue that this supplier does not sell yet.
 * Never carries another supplier's price — only what the product is.
 */
export interface CatalogPick {
  productId: string
  name: string
  nameEn: string | null
  description: string | null
  categoryId: string | null
  categoryName: string | null
  brand: string | null
  mpn: string | null
  baseUnit: string
  imageUrl: string | null
}

export interface OrderLine {
  id: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  /** The supplier marked it as not supplied when confirming. */
  unavailable: boolean
}

/** A carpenter's question from "שאלה לספק" in the agent chat. */
export interface SupplierQuestion {
  id: string
  createdAt: string
  carpenter: string
  contactName: string | null
  phone: string | null
  productName: string | null
  message: string
}

export interface SupplierOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  buyer: string
  /** Groups a carpentry's orders on the customers screen: its id, or its name on old orders. */
  customerKey: string
  contactName: string | null
  phone: string | null
  address: string | null
  notes: string | null
  paymentTerms: string | null
  lines: OrderLine[]
  total: number
  confirmedTotal: number | null
  supplierNote: string | null
  /** Also holds another supplier's lines, so it is confirmed centrally. */
  split: boolean
}

/** A file this supplier uploaded: a sheet on one product, or a catalogue for the whole business. */
export interface SupplierDoc {
  id: string
  productId: string | null
  productName: string | null
  title: string
  docType: string
  url: string
  fileName: string
  uploadedAt: string | null
}

export interface SupplierDocs {
  sheets: SupplierDoc[]
  catalogs: SupplierDoc[]
}

/** The "מנוי ופרסום" tab: this supplier's bookings, and which weeks are taken by anyone. */
export interface SupplierPromo {
  /** False on a database without migration 20261011130000; booking waits for it. */
  ready: boolean
  weeks: PromoWeek[]
  /** Bookable weeks already held by a request or an approval, from any supplier. Dates only. */
  taken: string[]
}

/** Quote requests from carpentries (T-023). */
export interface SupplierQuotes {
  /** False on a database without migration 20261011140000. */
  ready: boolean
  quotes: SupplierQuoteRequest[]
}

export interface CategoryOption {
  id: string
  name_he: string
  parent_category_id: string | null
}

/**
 * Every call from the supplier app goes through here, so a failure reads the
 * same on every screen: the server's own Hebrew message, or a plain fallback.
 */
export async function callApi<T = Record<string, unknown>>(
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, init)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'הפעולה נכשלה')
  }
  return data as T
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** An Israeli number as a WhatsApp link, or null if it cannot be one. */
export function whatsappLink(phone: string | null, text?: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `972${digits.slice(1)}`
  if (digits.length < 11) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
