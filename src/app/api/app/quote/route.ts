import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { loadProducts } from '@/lib/app/catalog-server'
import type { AppProduct } from '@/lib/app/products'

/**
 * Today's offers for the products in an order being put together.
 *
 * The cart lives in the browser and remembers the price it was added at; this
 * is where the order screen learns the current price, every supplier that
 * sells each line, and — for a supplier still short of its minimum — a few of
 * its other in-stock products to close the gap. Prices only for a signed-in
 * carpentry or the operator.
 */
export async function POST(request: NextRequest) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  if (!carpenter && !admin) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 200) : []
  if (ids.length === 0) return NextResponse.json({ products: [], suggestions: {} })

  const all = await loadProducts({ showPrices: true })
  const wanted = new Set(ids)
  const products = all.filter((p) => wanted.has(p.id))

  const supplierIds = new Set(products.flatMap((p) => p.offers.map((o) => o.supplierId)))
  const suggestions: Record<string, AppProduct[]> = {}
  for (const supplierId of supplierIds) {
    suggestions[supplierId] = all
      .filter((p) => !wanted.has(p.id) && p.offers.some((o) => o.supplierId === supplierId && o.inStock))
      .slice(0, 3)
  }

  return NextResponse.json({ products, suggestions })
}
