import { getSupabaseAdmin } from '@/lib/supabase-admin'
import SuppliersClient, { type SupplierRow } from './SuppliersClient'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const supabase = getSupabaseAdmin()

  const [{ data }, { data: offers }, { data: lines }] = await Promise.all([
    supabase
      .from('suppliers')
      // One literal, not a concatenation: PostgREST infers the row type from the
      // string itself, and a joined one degrades to an untyped error shape.
      .select(
        'id, company_name, business_id, contact_name, phone, email, city, address, pickup_address, min_order_value_excl_vat, default_lead_time_days, sells_note, logo_url, token, status, source, created_at, decided_at, payment_terms, terms_accepted_at'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('supplier_offers').select('supplier_id').limit(20000),
    supabase.from('order_items').select('supplier_id, order_id').not('supplier_id', 'is', null).limit(50000),
  ])

  const offersBy = new Map<string, number>()
  for (const offer of offers ?? []) {
    offersBy.set(offer.supplier_id, (offersBy.get(offer.supplier_id) ?? 0) + 1)
  }

  const ordersBy = new Map<string, Set<string>>()
  for (const line of lines ?? []) {
    if (!line.supplier_id) continue
    const set = ordersBy.get(line.supplier_id) ?? new Set<string>()
    set.add(line.order_id)
    ordersBy.set(line.supplier_id, set)
  }

  const rows: SupplierRow[] = (data ?? []).map((row) => ({
    ...row,
    offer_count: offersBy.get(row.id) ?? 0,
    order_count: ordersBy.get(row.id)?.size ?? 0,
  }))

  return <SuppliersClient rows={rows} />
}
