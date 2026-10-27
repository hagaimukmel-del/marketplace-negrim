import 'server-only'
import { cache } from 'react'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { bestOffer, unitLabel, type Offer } from '@/lib/catalog'
import { deliversTo, loadDelivery, regionsForCity } from '@/lib/delivery'
import type { RegionKey } from '@/lib/regions'
import { loadPriceModes } from '@/lib/price-mode'
import { activeThreshold } from '@/lib/quote-rules'
import { loadThresholds } from '@/lib/special-price'
import type { AppProduct, CategoryNode } from './products'

interface CategoryRow {
  id: string
  name_he: string
  parent_category_id: string | null
  sort_order: number
  icon: string | null
  is_active: boolean | null
}

interface ProductRow {
  id: string
  name_he: string
  description_he: string | null
  brand: string | null
  mpn: string | null
  base_unit: string
  image_url: string | null
  attributes: unknown
  category_id: string | null
  created_at: string | null
  supplier_offers: (Offer & {
    suppliers: {
      status: string
      company_name: string
      city: string | null
      logo_url: string | null
      payment_terms: string[] | null
      min_order_value_excl_vat: number | null
      default_lead_time_days: number | null
    }
  })[]
}

const PRODUCT_COLUMNS =
  'id, name_he, description_he, brand, mpn, base_unit, image_url, attributes, category_id, created_at, ' +
  'supplier_offers!inner(id, supplier_id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, min_order_qty, lead_time_days, ' +
  'suppliers!inner(status, company_name, city, logo_url, payment_terms, min_order_value_excl_vat, default_lead_time_days))'

// Cached per request: a page that loads products and then the category tree
// reads the table once instead of twice, one round trip fewer.
const categories = cache(async (): Promise<CategoryRow[]> => {
  const { data } = await getSupabaseAdmin()
    .from('categories')
    .select('id, name_he, parent_category_id, sort_order, icon, is_active')
  return ((data ?? []) as CategoryRow[]).filter((row) => row.is_active !== false)
})

function attributesOf(raw: unknown): [string, string][] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => [key, String(value)])
}

/**
 * No supplier keeps stock_qty current yet: the sheet sync writes a placeholder
 * 100 and a price list without a stock column writes 0 (CLAUDE.md §6: never
 * show it as real stock). Until a supplier does, nothing reads as "אזל" and
 * nothing is blocked from ordering; the supplier confirms availability on the
 * purchase order. bestOffer() still prefers a positive stock among suppliers.
 */
const STOCK_IS_TRACKED = false

/**
 * Live products — at least one active offer from an approved supplier — with
 * every offer and the terms of the supplier behind it. Prices are left out
 * entirely, not hidden, for a viewer who may not see them.
 */
/**
 * `city` is the signed-in carpentry's city. With it, each offer says whether
 * its supplier delivers there, and a supplier that does not is never the
 * suggested offer while another one does (T-026). bestOffer() still decides
 * among the offers that remain.
 */
/**
 * `popularity` also ranks every product by how often its page is opened, then
 * by how many purchase orders carried it, for "הכי נצפים" in the catalogue.
 * Only the rank reaches the browser, never the counts.
 */
export async function loadProducts(opts: { showPrices: boolean; ids?: string[]; city?: string | null; popularity?: boolean }): Promise<AppProduct[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('is_active', true)
    .eq('supplier_offers.is_active', true)
    .eq('supplier_offers.suppliers.status', 'approved')
    .limit(1000)
  if (opts.ids) query = query.in('id', opts.ids.length ? opts.ids : ['00000000-0000-0000-0000-000000000000'])

  // Only offers that have a threshold come back, so this stays small.
  const [{ data }, cats, delivery, modes, thresholds, popular] = await Promise.all([
    query,
    categories(),
    loadDelivery(),
    loadPriceModes(),
    loadThresholds({}),
    opts.popularity ? loadPopularity() : null,
  ])
  const carpenterRegions = regionsForCity(opts.city)
  const byId = new Map(cats.map((row) => [row.id, row]))

  const rows = (data ?? []) as unknown as ProductRow[]
  const rank = popular ? popularityRanks(rows.map((row) => row.id), popular) : null

  return rows.map((row) => {
    const delivers = new Map(row.supplier_offers.map((offer) => [offer.id, deliversTo(delivery.bySupplier.get(offer.supplier_id), carpenterRegions)]))
    const reachable = row.supplier_offers.filter((offer) => delivers.get(offer.id) !== false)
    const pool = reachable.length ? reachable : row.supplier_offers
    // A quote-only supplier's price never decides which offer leads: that
    // would tell a carpenter it is the cheapest without showing the price.
    const priced = pool.filter((offer) => !modes.quoteOnly.has(offer.supplier_id))
    const best = bestOffer({ supplier_offers: priced.length ? priced : pool })
    const category = row.category_id ? byId.get(row.category_id) : undefined
    const topId = category ? (category.parent_category_id && byId.has(category.parent_category_id) ? category.parent_category_id : category.id) : null
    return {
      id: row.id,
      name: row.name_he,
      brand: row.brand,
      mpn: row.mpn,
      baseUnit: row.base_unit,
      unit: unitLabel(row.base_unit),
      imageUrl: row.image_url,
      attributes: attributesOf(row.attributes),
      categoryId: row.category_id,
      icon: topId ? byId.get(topId)?.icon ?? null : null,
      topId,
      subId: category && topId !== category.id ? category.id : null,
      description: row.description_he?.trim() || null,
      createdAt: row.created_at,
      popularRank: rank?.get(row.id) ?? null,
      offers: row.supplier_offers.map((offer) => ({
        supplierId: offer.supplier_id,
        supplierName: offer.suppliers.company_name,
        supplierLogo: offer.suppliers.logo_url,
        supplierRegions: supplierRegions(offer.suppliers.city, delivery.bySupplier.get(offer.supplier_id)?.regions ?? []),
        // Left out, not hidden, for a supplier who answers with quotes only (T-023).
        price: opts.showPrices && !modes.quoteOnly.has(offer.supplier_id) ? Number(offer.price_excl_vat) : null,
        quoteOnly: modes.quoteOnly.has(offer.supplier_id),
        packLabel: offer.pack_label,
        packQty: offer.pack_qty == null ? null : Number(offer.pack_qty),
        inStock: STOCK_IS_TRACKED ? offer.stock_qty > 0 : true,
        leadDays: offer.lead_time_days ?? offer.suppliers.default_lead_time_days,
        terms: offer.suppliers.payment_terms ?? [],
        minOrder: offer.suppliers.min_order_value_excl_vat == null ? null : Number(offer.suppliers.min_order_value_excl_vat),
        minOrderQty: Number(offer.min_order_qty) > 0 ? Number(offer.min_order_qty) : 1,
        // A special price for quantity, from any supplier who set a threshold, only
        // while the threshold matches the current pack (stage 1 RFQ rules). It is a
        // quantity, never a price, so it is safe for a quote-only supplier too.
        specialMinQty: activeThreshold(thresholds.get(offer.id), offer.pack_qty == null ? null : Number(offer.pack_qty)),
        delivers: delivers.get(offer.id) ?? null,
        suggested: offer.id === best?.id,
      })),
    }
  })
}

/** Where a supplier sits and where it delivers, as one list of regions, for the "אזור הספק" filter. */
function supplierRegions(city: string | null, delivers: RegionKey[]): RegionKey[] {
  return [...new Set([...regionsForCity(city), ...delivers])]
}

interface Popularity {
  views: Map<string, number>
  orders: Map<string, number>
}

/**
 * Page views (migration 20261027072150) and purchase orders per product. Each
 * read stands alone: a database without the views table, or a failed read,
 * counts as zero rather than emptying the catalogue.
 */
async function loadPopularity(): Promise<Popularity> {
  const supabase = getSupabaseAdmin()
  const [viewRes, orderRes] = await Promise.all([
    supabase.from('product_view_counts').select('product_id, views').limit(5000),
    supabase
      .from('order_items')
      .select('product_id, order_id, orders!inner(status)')
      .neq('orders.status', 'cancelled')
      .limit(10000),
  ])
  const views = new Map<string, number>()
  for (const row of viewRes.error ? [] : viewRes.data ?? []) views.set(row.product_id, row.views)
  const seen = new Set<string>()
  const orders = new Map<string, number>()
  for (const row of orderRes.error ? [] : orderRes.data ?? []) {
    if (!row.product_id || seen.has(`${row.product_id}:${row.order_id}`)) continue
    seen.add(`${row.product_id}:${row.order_id}`)
    orders.set(row.product_id, (orders.get(row.product_id) ?? 0) + 1)
  }
  return { views, orders }
}

/** 0 is the most viewed; ties go to the product ordered more often. */
function popularityRanks(ids: string[], popular: Popularity): Map<string, number> {
  const score = (id: string) => [popular.views.get(id) ?? 0, popular.orders.get(id) ?? 0]
  const sorted = [...ids].sort((a, b) => {
    const [va, oa] = score(a)
    const [vb, ob] = score(b)
    return vb - va || ob - oa
  })
  return new Map(sorted.map((id, index) => [id, index]))
}

/**
 * Counts one opening of a product page. Never awaited by the page: a lost
 * count is fine, a slower or failed page is not.
 */
export async function recordProductView(productId: string): Promise<void> {
  await getSupabaseAdmin().rpc('bump_product_view', { p_product_id: productId })
}

/** The category tree in its own order, with how many live products sit in each. */
export async function loadCategoryTree(products: AppProduct[]): Promise<CategoryNode[]> {
  const cats = await categories()
  const sort = (a: CategoryRow, b: CategoryRow) => a.sort_order - b.sort_order || a.name_he.localeCompare(b.name_he, 'he')
  return cats
    .filter((row) => !row.parent_category_id)
    .sort(sort)
    .map((top) => ({
      id: top.id,
      name: top.name_he,
      icon: top.icon,
      count: products.filter((product) => product.topId === top.id).length,
      children: cats
        .filter((row) => row.parent_category_id === top.id)
        .sort(sort)
        .map((child) => ({
          id: child.id,
          name: child.name_he,
          count: products.filter((product) => product.subId === child.id).length,
        })),
    }))
}

export interface ReorderItem {
  product: AppProduct
  supplierId: string
  lastQuantity: number
  lastUnitPrice: number
  lastAt: string
}

/**
 * What this carpenter bought before, newest first, from the same supplier as
 * last time, at that supplier's price today. A product nobody sells any more,
 * or that supplier no longer offers, is simply not offered again.
 */
export async function loadReorder(carpenterId: string, limit = 6): Promise<ReorderItem[]> {
  const { data } = await getSupabaseAdmin()
    .from('order_items')
    .select('product_id, supplier_id, quantity, unit_price_excl_vat, created_at, orders!inner(carpenter_id, status)')
    .eq('orders.carpenter_id', carpenterId)
    .neq('orders.status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(100)

  const seen = new Set<string>()
  const history: { productId: string; supplierId: string; quantity: number; unitPrice: number; at: string }[] = []
  for (const row of data ?? []) {
    if (!row.product_id || !row.supplier_id || seen.has(row.product_id)) continue
    seen.add(row.product_id)
    history.push({
      productId: row.product_id,
      supplierId: row.supplier_id,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price_excl_vat),
      at: row.created_at ?? new Date(0).toISOString(),
    })
  }
  if (history.length === 0) return []

  const products = new Map((await loadProducts({ showPrices: true, ids: history.map((item) => item.productId) })).map((p) => [p.id, p]))
  return history
    .filter((item) => products.get(item.productId)?.offers.some((offer) => offer.supplierId === item.supplierId))
    .slice(0, limit)
    .map((item) => ({
      product: products.get(item.productId)!,
      supplierId: item.supplierId,
      lastQuantity: item.quantity,
      lastUnitPrice: item.unitPrice,
      lastAt: item.at,
    }))
}
