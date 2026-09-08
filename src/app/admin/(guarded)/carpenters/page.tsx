import { getSupabaseAdmin } from '@/lib/supabase-admin'
import CarpentersClient from './CarpentersClient'

export const dynamic = 'force-dynamic'

export default async function CarpentersPage() {
  const supabase = getSupabaseAdmin()

  const { data: carpenters } = await supabase
    .from('carpenters')
    .select('id, token, business_name, contact_name, phone, city, first_seen_at, is_active, source')
    .order('created_at', { ascending: false })
    .limit(1000)

  const rows = carpenters ?? []

  return (
    <CarpentersClient
      rows={rows}
      opened={rows.filter((row) => row.first_seen_at).length}
    />
  )
}
