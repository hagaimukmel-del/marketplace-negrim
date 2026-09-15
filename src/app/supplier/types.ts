/**
 * The shapes the supplier app passes around, and the two small helpers every
 * tab uses. Kept free of server-only imports so both the page and the client
 * tabs can read it.
 */

export type Tab = 'orders' | 'products' | 'business' | 'terms'

export const TABS: readonly Tab[] = ['orders', 'products', 'business', 'terms']

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
  isActive: boolean
  /** Only the supplier who created a product may change what is shared. */
  canEditProduct: boolean
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
}

export interface SupplierOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  buyer: string
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
