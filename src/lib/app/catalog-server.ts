import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { bestOffer, unitLabel, type Offer } from '@/lib/catalog'
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
  brand: string | null
  mpn: string | null
  base_unit: string
  image_url: string | null
  attributes: unknown
  category_id: string | null
  supplier_offers: (Offer & {
    suppliers: {
      status: string
      company_name: string
      payment_terms: string[] | null
      min_order_value_excl_vat: number | null
      default_lead_time_days: number | null
    }
  })[]
}

const PRODUCT_COLUMNS =
  'id, name_he, brand, mpn, base_unit, image_url, attributes, category_id, ' +
  'supplier_offers!inner(id, supplier_id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, min_order_qty, lead_time_days, ' +
  'suppliers!inner(status, company_name, payment_terms, min_order_value_excl_vat, default_lead_time_days))'

async function categories(): Promise<CategoryRow[]> {
  const { data } = await getSupabaseAdmin()
    .from('categories')
    .select('id, name_he, parent_category_id, sort_order, icon, is_active')
  return ((data ?? []) as CategoryRow[]).filter((row) => row.is_active !== false)
}

function attributesOf(raw: unknown): [string, string][] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => [key, String(value)])
}

/**
 * Live products — at least one active offer from an approved supplier — with
 * every offer and the terms of the supplier behind it. Prices are left out
 * entirely, not hidden, for a viewer who may not see them.
 */
export async function loadProducts(opts: { showPrices: boolean; ids?: string[] }): Promise<AppProduct[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('is_active', true)
    .eq('supplier_offers.is_active', true)
    .eq('supplier_offers.suppliers.status', 'approved')
    .limit(1000)
  if (opts.ids) query = query.in('id', opts.ids.length ? opts.ids : ['00000000-0000-0000-0000-000000000000'])

  const [{ data }, cats] = await Promise.all([query, categories()])
  const byId = new Map(cats.map((row) => [row.id, row]))

  return ((data ?? []) as unknown as ProductRow[]).map((row) => {
    const best = bestOffer(row)
    const category = row.category_id ? byId.get(row.category_id) : undefined
    const topId = category ? (category.parent_category_id && byId.has(category.parent_category_id) ? category.parent_category_id : category.id) : null
    return {
      id: row.id,
      name: row.name_he,
      brand: row.brand,
      mpn: row.mpn,
      unit: unitLabel(row.base_unit),
      imageUrl: row.image_url,
      attributes: attributesOf(row.attributes),
      categoryId: row.category_id,
      icon: topId ? byId.get(topId)?.icon ?? null : null,
      topId,
      subId: category && topId !== category.id ? category.id : null,
      offers: row.supplier_offers.map((offer) => ({
        supplierId: offer.supplier_id,
        supplierName: offer.suppliers.company_name,
        price: opts.showPrices ? Number(offer.price_excl_vat) : null,
        packLabel: offer.pack_label,
        packQty: offer.pack_qty == null ? null : Number(offer.pack_qty),
        inStock: offer.stock_qty > 0,
        leadDays: offer.lead_time_days ?? offer.suppliers.default_lead_time_days,
        terms: offer.suppliers.payment_terms ?? [],
        minOrder: offer.suppliers.min_order_value_excl_vat == null ? null : Number(offer.suppliers.min_order_value_excl_vat),
        suggested: offer.id === best?.id,
      })),
    }
  })
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
