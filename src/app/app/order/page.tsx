import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OrderView from './OrderView'

export const dynamic = 'force-dynamic'

/**
 * The order being put together. The lines live in the browser; the carpentry's
 * delivery details are read here so they never have to be typed again.
 */
export default async function AppOrder() {
  const carpenter = await getSessionCarpenter()
  let profile: { address: string; city: string; hasContact: boolean } | null = null

  if (carpenter) {
    const { data } = await getSupabaseAdmin()
      .from('carpenters')
      .select('address, city, email, phone')
      .eq('id', carpenter.id)
      .maybeSingle()
    const { data: lastOrder } = await getSupabaseAdmin()
      .from('orders')
      .select('address, city')
      .eq('carpenter_id', carpenter.id)
      .not('address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    profile = {
      address: data?.address ?? lastOrder?.address ?? '',
      city: data?.city ?? lastOrder?.city ?? '',
      hasContact: Boolean(data?.email && data?.phone),
    }
  }

  return <OrderView profile={profile} />
}
