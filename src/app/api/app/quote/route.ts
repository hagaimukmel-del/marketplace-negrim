import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { loadProducts } from '@/lib/app/catalog-server'
import type { AppProduct } from '@/lib/app/products'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { israelDate, stateOf } from '@/lib/quotes'

/**
 * Today's offers for the products in an order being put together.
 *
 * The cart lives in the browser and remembers the price it was added at; this
 * is where the order screen learns the current price, every supplier that
 * sells each line, and — for a supplier still short of its minimum — a few of
 * its other in-stock products to close the gap. Prices only for a signed-in
 * carpentry or the operator.
 *
 * It also says which of the cart's quotes can no longer be ordered at: already
 * ordered (from another device, or an earlier send) or expired. Those lines
 * would only fail the send, so the cart takes them out.
 */
export async function POST(request: NextRequest) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  if (!carpenter && !admin) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 200) : []
  if (ids.length === 0) return NextResponse.json({ products: [], suggestions: {}, spentQuotes: [] })
  const quoteIds = Array.isArray(body?.quoteIds) ? (body.quoteIds as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 200) : []

  const all = await loadProducts({ showPrices: true, city: carpenter?.city })
  const wanted = new Set(ids)
  const products = all.filter((p) => wanted.has(p.id))

  const supplierIds = new Set(products.flatMap((p) => p.offers.map((o) => o.supplierId)))
  const suggestions: Record<string, AppProduct[]> = {}
  for (const supplierId of supplierIds) {
    suggestions[supplierId] = all
      .filter((p) => !wanted.has(p.id) && p.offers.some((o) => o.supplierId === supplierId && o.inStock && !o.quoteOnly))
      .slice(0, 3)
  }

  const spentQuotes: { id: string; state: string; orderId: string | null }[] = []
  if (carpenter && quoteIds.length) {
    const { data } = await getSupabaseAdmin()
      .from('quote_requests')
      .select('id, status, valid_until, order_id')
      .eq('carpenter_id', carpenter.id)
      .in('id', quoteIds)
    const today = israelDate()
    for (const row of data ?? []) {
      const state = stateOf(row.status, row.valid_until, today)
      if (state !== 'quoted') spentQuotes.push({ id: row.id, state, orderId: row.order_id })
    }
  }

  return NextResponse.json({ products, suggestions, spentQuotes })
}
