import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OrderSearchClient from './order-search-client'

/**
 * /app/order - Carpenter procurement page
 *
 * Flow:
 * 1. Search products by text
 * 2. Show results with live pricing
 * 3. Carpenter selects and confirms
 * 4. Order created
 */

interface PageProps {
  searchParams?: {
    token?: string
  }
}

export default async function OrderPage(props: PageProps) {
  const token = props.searchParams?.token

  if (!token) {
    notFound()
  }

  // Get carpenter from token
  const supabase = getSupabaseAdmin()
  const { data: carpenter, error } = await supabase
    .from('carpenters')
    .select('id, business_name')
    .eq('token', token)
    .single()

  if (error || !carpenter) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">הזמנת רכש</h1>
          <p className="text-slate-600">
            {carpenter.business_name} — חפש ובחר מוצרים מספקים מאושרים
          </p>
        </div>

        {/* Search & Results */}
        <OrderSearchClient carpenterId={carpenter.id} />
      </div>
    </div>
  )
}
