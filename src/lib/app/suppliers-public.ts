import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName } from '@/lib/email'
import { isRegionKey, type RegionKey } from '@/lib/regions'
import { CATALOG_PREFIX, catalogUrl } from '@/lib/supplier-documents'
import type { AppProduct } from './products'

/**
 * Supplier pages (product review 2026-11-12): who the supplier is, what it
 * sells and where it delivers. The name, logo, city, "what we sell" and
 * delivery regions are public (owner, 2026-11-12); payment terms, minimum
 * order and lead time are for registered carpentries only, so they are read
 * here but only `SupplierTerms` carries them, and the page passes that on only
 * to a viewer who may see prices.
 *
 * A supplier is listed only when it is approved, is not a test business, and
 * sells at least one live product: an empty page would show a supplier with
 * nothing to offer (CLAUDE.md §0, no fictitious content).
 */

export interface PublicSupplier {
  id: string
  name: string
  logoUrl: string | null
  city: string | null
  about: string | null
  regions: RegionKey[]
  productCount: number
}

export interface SupplierTerms {
  paymentTerms: string[]
  minOrder: number | null
  leadDays: number | null
  freeDeliveryFrom: number | null
}

export interface SupplierCatalog {
  id: string
  title: string
  url: string
}

interface SupplierRow {
  id: string
  company_name: string
  logo_url: string | null
  city: string | null
  sells_note: string | null
  delivery_regions: string[] | null
  payment_terms: string[] | null
  min_order_value_excl_vat: number | null
  default_lead_time_days: number | null
  free_delivery_from_excl_vat: number | null
}

const COLUMNS =
  'id, company_name, logo_url, city, sells_note, delivery_regions, payment_terms, min_order_value_excl_vat, default_lead_time_days, free_delivery_from_excl_vat'

/** How many live products each supplier sells, from the catalogue already loaded. */
export function productCounts(products: AppProduct[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const product of products) {
    for (const supplierId of new Set(product.offers.map((offer) => offer.supplierId))) {
      counts.set(supplierId, (counts.get(supplierId) ?? 0) + 1)
    }
  }
  return counts
}

function toPublic(row: SupplierRow, count: number): PublicSupplier {
  return {
    id: row.id,
    name: row.company_name,
    logoUrl: row.logo_url,
    city: row.city?.trim() || null,
    about: row.sells_note?.trim() || null,
    regions: (row.delivery_regions ?? []).filter(isRegionKey),
    productCount: count,
  }
}

/** Every supplier a visitor may see, by name. `products` is the live catalogue. */
export async function loadPublicSuppliers(products: AppProduct[]): Promise<PublicSupplier[]> {
  const counts = productCounts(products)
  if (counts.size === 0) return []
  const { data } = await getSupabaseAdmin().from('suppliers').select(COLUMNS).eq('status', 'approved').in('id', [...counts.keys()])
  return ((data ?? []) as SupplierRow[])
    .filter((row) => !isTestName(row.company_name))
    .map((row) => toPublic(row, counts.get(row.id) ?? 0))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

/** One supplier's page, or null when it may not be shown. */
export async function loadPublicSupplier(id: string, products: AppProduct[]): Promise<{ supplier: PublicSupplier; terms: SupplierTerms } | null> {
  const count = productCounts(products).get(id) ?? 0
  if (count === 0 || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await getSupabaseAdmin().from('suppliers').select(COLUMNS).eq('id', id).eq('status', 'approved').maybeSingle()
  const row = data as SupplierRow | null
  if (!row || isTestName(row.company_name)) return null
  return {
    supplier: toPublic(row, count),
    terms: {
      paymentTerms: row.payment_terms ?? [],
      minOrder: row.min_order_value_excl_vat == null ? null : Number(row.min_order_value_excl_vat),
      leadDays: row.default_lead_time_days,
      freeDeliveryFrom: row.free_delivery_from_excl_vat == null ? null : Number(row.free_delivery_from_excl_vat),
    },
  }
}

/** Name and description for the page title: a light read, no catalogue. */
export async function loadSupplierHead(id: string): Promise<{ name: string; about: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await getSupabaseAdmin().from('suppliers').select('company_name, sells_note').eq('id', id).eq('status', 'approved').maybeSingle()
  if (!data || isTestName(data.company_name)) return null
  return { name: data.company_name, about: data.sells_note?.trim() || null }
}

/** The general catalogues the supplier uploaded in its console. */
export async function loadSupplierCatalogs(supplierId: string): Promise<SupplierCatalog[]> {
  const { data } = await getSupabaseAdmin()
    .from('supplier_documents')
    .select('id, file_name, file_path, description')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .like('file_path', `${CATALOG_PREFIX}%`)
    .order('uploaded_at', { ascending: false })
    .limit(10)
  return (data ?? []).map((row) => ({ id: row.id, title: row.description || row.file_name, url: catalogUrl(row.file_path) }))
}

/**
 * Counts one opening of a supplier page, per supplier per day (migration
 * 20261112100000), so a supplier can be shown how often carpentries looked.
 * Never awaited by the page, and a database without the migration only loses
 * the count.
 */
export async function recordSupplierView(supplierId: string): Promise<void> {
  await getSupabaseAdmin().rpc('bump_supplier_view', { p_supplier_id: supplierId })
}

/** The products this supplier sells, each led by this supplier's own offer. */
export function productsOf(supplierId: string, products: AppProduct[]): AppProduct[] {
  return products
    .filter((product) => product.offers.some((offer) => offer.supplierId === supplierId))
    .map((product) => ({ ...product, offers: product.offers.map((offer) => ({ ...offer, suggested: offer.supplierId === supplierId })) }))
}
