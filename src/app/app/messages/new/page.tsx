import { notFound } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import NewMessage from '@/components/messages/NewMessage'

export const dynamic = 'force-dynamic'

/** A new message to a supplier: ?supplier=…&product=… or ?order=… */
export default async function AppNewMessage({ searchParams }: { searchParams: Promise<{ supplier?: string; product?: string; order?: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="ההודעות" />
  const { supplier, product, order } = await searchParams
  const supabase = getSupabaseAdmin()

  if (order) {
    const { data } = await supabase
      .from('orders')
      .select('id, short_number, order_number, carpenter_id, suppliers(company_name)')
      .eq('id', order)
      .maybeSingle()
    if (!data || data.carpenter_id !== carpenter.id) notFound()
    const name = (data.suppliers as { company_name: string } | null)?.company_name ?? 'הספק'
    return (
      <div className="pt-3">
        <NewMessage
          apiBase="/api/app/messages"
          hrefBase="/app/messages"
          to={name}
          about={`על הזמנה ${data.short_number ? `#${data.short_number}` : data.order_number}`}
          payload={{ orderId: data.id }}
        />
      </div>
    )
  }

  if (!supplier) notFound()
  const [{ data: seller }, { data: item }] = await Promise.all([
    supabase.from('suppliers').select('id, company_name, status').eq('id', supplier).maybeSingle(),
    product ? supabase.from('products').select('id, name_he').eq('id', product).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (!seller || seller.status !== 'approved') notFound()
  return (
    <div className="pt-3">
      <NewMessage
        apiBase="/api/app/messages"
        hrefBase="/app/messages"
        to={seller.company_name}
        about={item ? `על ${item.name_he}` : 'שאלה כללית'}
        payload={{ supplierId: seller.id, ...(item ? { productId: item.id } : {}) }}
      />
    </div>
  )
}
