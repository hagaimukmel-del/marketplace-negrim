import { getSupabaseAdmin } from '@/lib/supabase-admin'
import CarpentersClient, { type CarpenterRow, type DrawRow } from './CarpentersClient'

export const dynamic = 'force-dynamic'

export default async function CarpentersPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: carpenters }, { data: orders }, { data: draws }] = await Promise.all([
    supabase
      .from('carpenters')
      .select(
        'id, token, business_name, contact_name, phone, email, city, address, first_seen_at, last_seen_at, created_at, is_active, source, terms_accepted_at, terms_version, marketing_consent'
      )
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('orders').select('carpenter_id').not('carpenter_id', 'is', null).limit(20000),
    supabase
      .from('raffle_draws')
      .select('id, carpenter_id, winner_name, winner_email, prize, pool_size, included_test, drawn_at, notified_at')
      .order('drawn_at', { ascending: false })
      .limit(20),
  ])

  const ordersBy = new Map<string, number>()
  for (const order of orders ?? []) {
    if (order.carpenter_id) {
      ordersBy.set(order.carpenter_id, (ordersBy.get(order.carpenter_id) ?? 0) + 1)
    }
  }

  const rows: CarpenterRow[] = (carpenters ?? []).map((row) => ({
    ...row,
    orders: ordersBy.get(row.id) ?? 0,
  }))

  return <CarpentersClient rows={rows} draws={(draws ?? []) as DrawRow[]} />
}
