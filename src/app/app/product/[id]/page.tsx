import { notFound } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import ProductView, { type LastPurchase } from './ProductView'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}

/** One product: the price as the anchor, who sells it and why, and one add action. */
export default async function AppProduct({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, carpenter, admin] = await Promise.all([params, getSessionCarpenter(), isAdmin()])
  const showPrices = Boolean(carpenter) || admin
  const [product] = await loadProducts({ showPrices, ids: [id] })
  if (!product) notFound()

  const tree = await loadCategoryTree([product])
  const top = tree.find((node) => node.id === product.topId)
  const sub = top?.children.find((child) => child.id === product.subId)

  // What this carpentry paid last time — the snapshot on its own order line.
  let last: LastPurchase | null = null
  if (carpenter) {
    const { data } = await getSupabaseAdmin()
      .from('order_items')
      .select('quantity, unit_price_excl_vat, supplier_id, created_at, orders!inner(carpenter_id, status)')
      .eq('orders.carpenter_id', carpenter.id)
      .neq('orders.status', 'cancelled')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.supplier_id) {
      last = { quantity: Number(data.quantity), unitPrice: Number(data.unit_price_excl_vat), supplierId: data.supplier_id, at: data.created_at ?? '' }
    }
  }

  return (
    <ProductView
      product={product}
      showPrices={showPrices}
      last={last}
      now={nowMs()}
      crumbs={{ topId: top?.id ?? null, top: top?.name ?? 'קטלוג', sub: sub?.name ?? null }}
    />
  )
}
