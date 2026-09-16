import { getSupabaseAdmin } from '@/lib/supabase-admin'
import ReportsClient, {
  type CategoryReport,
  type Period,
  type ProductReport,
  type SupplierReport,
} from './ReportsClient'

export const dynamic = 'force-dynamic'

const PERIODS: Record<Period, number | null> = { '30': 30, '90': 90, '365': 365, all: null }

interface OfferRow {
  supplier_id: string
  price_excl_vat: number
  stock_qty: number
  is_active: boolean
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

/**
 * The operator's numbers, three ways: by product, by supplier, by category.
 *
 * Prices come from the live offers — what the catalogue shows today. Sales come
 * from order lines in the chosen period, cancelled orders excluded. A supplier's
 * price index compares each of their prices to the average for the same product
 * across every supplier who sells it: 100 is the market, 92 is 8% cheaper.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: requested } = await searchParams
  const period: Period = requested && requested in PERIODS ? (requested as Period) : '90'
  const days = PERIODS[period]
  const since = days ? daysAgo(days) : null

  const supabase = getSupabaseAdmin()
  let lineQuery = supabase
    .from('order_items')
    .select('order_id, product_id, supplier_id, quantity, line_total_excl_vat, orders!inner(created_at, status)')
    .neq('orders.status', 'cancelled')
    .limit(50000)
  if (since) lineQuery = lineQuery.gte('orders.created_at', since)

  const [{ data: products }, { data: suppliers }, { data: categories }, { data: lines }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name_he, category_id, is_active, supplier_offers(supplier_id, price_excl_vat, stock_qty, is_active)')
      .limit(20000),
    supabase.from('suppliers').select('id, company_name, status'),
    supabase.from('categories').select('id, name_he, parent_category_id, sort_order'),
    lineQuery,
  ])

  const categoryById = new Map((categories ?? []).map((category) => [category.id, category]))
  const topOf = (categoryId: string | null) => {
    const category = categoryId ? categoryById.get(categoryId) : undefined
    if (!category) return null
    return category.parent_category_id ? categoryById.get(category.parent_category_id) ?? category : category
  }
  const supplierName = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier.company_name]))

  // Sales, keyed by product and by supplier.
  const salesByProduct = new Map<string, { qty: number; revenue: number; orders: Set<string> }>()
  const salesBySupplier = new Map<string, { revenue: number; orders: Set<string> }>()
  for (const line of lines ?? []) {
    const revenue = Number(line.line_total_excl_vat)
    if (line.product_id) {
      const entry = salesByProduct.get(line.product_id) ?? { qty: 0, revenue: 0, orders: new Set<string>() }
      entry.qty += Number(line.quantity)
      entry.revenue += revenue
      entry.orders.add(line.order_id)
      salesByProduct.set(line.product_id, entry)
    }
    if (line.supplier_id) {
      const entry = salesBySupplier.get(line.supplier_id) ?? { revenue: 0, orders: new Set<string>() }
      entry.revenue += revenue
      entry.orders.add(line.order_id)
      salesBySupplier.set(line.supplier_id, entry)
    }
  }

  const productRows: ProductReport[] = []
  // supplier id -> ratios of their price to the product's average
  const ratios = new Map<string, number[]>()
  const offersBySupplier = new Map<string, number>()

  for (const product of products ?? []) {
    const live = ((product.supplier_offers ?? []) as OfferRow[]).filter((offer) => offer.is_active)
    const prices = live.map((offer) => Number(offer.price_excl_vat))
    const avg = mean(prices)
    for (const offer of live) {
      offersBySupplier.set(offer.supplier_id, (offersBySupplier.get(offer.supplier_id) ?? 0) + 1)
      if (live.length > 1 && avg) {
        const list = ratios.get(offer.supplier_id) ?? []
        list.push(Number(offer.price_excl_vat) / avg)
        ratios.set(offer.supplier_id, list)
      }
    }
    const sales = salesByProduct.get(product.id)
    if (live.length === 0 && !sales) continue

    const top = topOf(product.category_id)
    const leaf = product.category_id ? categoryById.get(product.category_id) : undefined
    productRows.push({
      id: product.id,
      name: product.name_he,
      category: top ? (leaf && leaf.id !== top.id ? `${top.name_he} › ${leaf.name_he}` : top.name_he) : 'ללא קטגוריה',
      suppliers: live.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      avgPrice: avg,
      maxPrice: prices.length ? Math.max(...prices) : null,
      stock: live.reduce((sum, offer) => sum + offer.stock_qty, 0),
      qty: sales?.qty ?? 0,
      orders: sales?.orders.size ?? 0,
      revenue: sales?.revenue ?? 0,
    })
  }

  const supplierRows: SupplierReport[] = (suppliers ?? [])
    .filter((supplier) => supplier.status !== 'rejected')
    .map((supplier) => {
      const sales = salesBySupplier.get(supplier.id)
      const list = ratios.get(supplier.id) ?? []
      const index = mean(list)
      return {
        id: supplier.id,
        name: supplier.company_name,
        status: supplier.status,
        offers: offersBySupplier.get(supplier.id) ?? 0,
        comparable: list.length,
        priceIndex: index == null ? null : index * 100,
        orders: sales?.orders.size ?? 0,
        revenue: sales?.revenue ?? 0,
      }
    })

  const categoryRows: CategoryReport[] = (categories ?? [])
    .filter((category) => !category.parent_category_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((top) => {
      const inTop = (products ?? []).filter((product) => topOf(product.category_id)?.id === top.id)
      const live = inTop.filter((product) => ((product.supplier_offers ?? []) as OfferRow[]).some((offer) => offer.is_active))
      const supplierIds = new Set<string>()
      const avgPrices: number[] = []
      let qty = 0
      let revenue = 0
      const orders = new Set<string>()
      for (const product of inTop) {
        const offers = ((product.supplier_offers ?? []) as OfferRow[]).filter((offer) => offer.is_active)
        offers.forEach((offer) => supplierIds.add(offer.supplier_id))
        const avg = mean(offers.map((offer) => Number(offer.price_excl_vat)))
        if (avg != null) avgPrices.push(avg)
        const sales = salesByProduct.get(product.id)
        if (sales) {
          qty += sales.qty
          revenue += sales.revenue
          sales.orders.forEach((order) => orders.add(order))
        }
      }
      return {
        id: top.id,
        name: top.name_he,
        products: live.length,
        suppliers: supplierIds.size,
        avgPrice: mean(avgPrices),
        qty,
        orders: orders.size,
        revenue,
      }
    })

  const orderIds = new Set((lines ?? []).map((line) => line.order_id))

  return (
    <ReportsClient
      period={period}
      products={productRows}
      suppliers={supplierRows}
      categories={categoryRows}
      totals={{
        products: productRows.filter((row) => row.suppliers > 0).length,
        offers: [...offersBySupplier.values()].reduce((sum, count) => sum + count, 0),
        suppliers: supplierRows.filter((row) => row.status === 'approved').length,
        orders: orderIds.size,
        revenue: (lines ?? []).reduce((sum, line) => sum + Number(line.line_total_excl_vat), 0),
      }}
      supplierNames={Object.fromEntries(supplierName)}
    />
  )
}
