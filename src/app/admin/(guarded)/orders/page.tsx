import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

// One string literal, not a concatenation: supabase-js infers the row shape
// from the select at the type level, and it cannot read a built-up expression.
const SELECT =
  'id, order_number, created_at, status, customer_name, business_name, customer_phone, payment_method, subtotal_excl_vat, confirmed_subtotal_excl_vat, confirmed_at, supplier_note, carpenter_id, order_items(id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat)'

export default async function AdminOrdersPage() {
  const { data } = await getSupabaseAdmin()
    .from('orders')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(200)

  return <OrdersClient orders={data ?? []} />
}
