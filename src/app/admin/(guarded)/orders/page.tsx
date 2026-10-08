import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OrdersClient from './OrdersClient'
import { isOperatorManaged } from '@/lib/admin-scope'

export const dynamic = 'force-dynamic'

// One string literal, not a concatenation: supabase-js infers the row shape
// from the select at the type level, and it cannot read a built-up expression.
const SELECT =
  'id, order_number, short_number, created_at, status, customer_name, business_name, customer_phone, payment_method, subtotal_excl_vat, confirmed_subtotal_excl_vat, confirmed_at, supplier_note, carpenter_id, checkout_id, suppliers(company_name, source), order_items(id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat)'

export default async function AdminOrdersPage() {
  const { data } = await getSupabaseAdmin()
    .from('orders')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(200)

  // A self-run supplier's lines stay on the server until someone asks for
  // them for support (GET /api/admin/orders/[id], logged).
  const orders = (data ?? []).map((order) => {
    const managed = isOperatorManaged(order.suppliers?.source)
    return {
      ...order,
      managed,
      line_count: order.order_items.length,
      order_items: managed ? order.order_items : null,
    }
  })

  return <OrdersClient orders={orders} />
}
