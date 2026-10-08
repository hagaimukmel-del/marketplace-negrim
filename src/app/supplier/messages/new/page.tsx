import { notFound, redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import NewMessage from '@/components/messages/NewMessage'

export const dynamic = 'force-dynamic'

/** A supplier writes to a carpentry about an order sent to it: ?order=… */
export default async function SupplierNewMessage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  const { order } = await searchParams
  if (!order) notFound()
  const { data } = await getSupabaseAdmin()
    .from('orders')
    .select('id, short_number, order_number, supplier_id, business_name, customer_name')
    .eq('id', order)
    .maybeSingle()
  if (!data || data.supplier_id !== supplier.id) notFound()
  return (
    <NewMessage
      apiBase="/api/supplier/messages"
      hrefBase="/supplier/messages"
      to={data.business_name || data.customer_name || 'הנגרייה'}
      about={`על הזמנה ${data.short_number ? `#${data.short_number}` : data.order_number}`}
      payload={{ orderId: data.id }}
    />
  )
}
