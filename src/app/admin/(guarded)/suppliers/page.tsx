import { getSupabaseAdmin } from '@/lib/supabase-admin'
import SuppliersClient from './SuppliersClient'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select(
      'id, company_name, business_id, contact_name, phone, email, city, sells_note, status, source, created_at, decided_at'
    )
    // Applications waiting on a decision come first; the rest by newest.
    .order('created_at', { ascending: false })
    .limit(500)

  return <SuppliersClient rows={data ?? []} />
}
