import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { loadCategoryTree, loadProducts, loadReorder } from '@/lib/app/catalog-server'
import { redirect } from 'next/navigation'
import HomeView from './HomeView'

export const dynamic = 'force-dynamic'

function israelHour(): number {
  return Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }))
}

function nowMs(): number {
  return Date.now()
}

/**
 * Home: calm control. Everything is read here; the view only adds what lives in
 * the browser — the order being put together.
 */
export default async function AppHome() {
  const carpenter = await getSessionCarpenter()
  // Home is a carpentry's own screen; a visitor starts on the catalogue.
  if (!carpenter) redirect('/app/catalog')

  const [orders, reorder, products, { data: suppliers }] = await Promise.all([
    loadCarpenterOrders(carpenter.id),
    loadReorder(carpenter.id, 3),
    loadProducts({ showPrices: true }),
    getSupabaseAdmin().from('suppliers').select('id, company_name, min_order_value_excl_vat').eq('status', 'approved'),
  ])
  const categories = await loadCategoryTree(products)

  const hour = israelHour()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const name = carpenter.contact_name?.trim().split(/\s+/)[0] || carpenter.business_name

  return (
    <HomeView
      greeting={`${greeting}, ${name}`}
      now={nowMs()}
      orders={orders}
      reorder={reorder}
      categories={categories}
      minimums={Object.fromEntries((suppliers ?? []).map((s) => [s.id, { name: s.company_name, min: s.min_order_value_excl_vat == null ? null : Number(s.min_order_value_excl_vat) }]))}
    />
  )
}
