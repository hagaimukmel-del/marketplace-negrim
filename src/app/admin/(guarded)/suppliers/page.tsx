import { getSupabaseAdmin } from '@/lib/supabase-admin'
import SuppliersClient from './SuppliersClient'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    // One literal, not a concatenation: PostgREST infers the row type from the
    // string itself, and a joined one degrades to an untyped error shape.
    .select(
      'id, company_name, business_id, contact_name, phone, email, city, address, pickup_address, min_order_value_excl_vat, default_lead_time_days, sells_note, logo_url, status, source, created_at, decided_at'
    )
    // Applications waiting on a decision come first; the rest by newest.
    .order('created_at', { ascending: false })
    .limit(500)

  return <SuppliersClient rows={data ?? []} />
}
