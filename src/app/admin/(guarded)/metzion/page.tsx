import { getSupabaseAdmin } from '@/lib/supabase-admin'
import MetzionAdmin, { type AdminListing, type AdminReport } from './MetzionAdmin'

export const dynamic = 'force-dynamic'

export default async function MetzionAdminPage() {
  const supabase = getSupabaseAdmin()
  const [{ data: listings }, { data: reports }] = await Promise.all([
    supabase
      .from('metzion_listings')
      .select('id, title, deal_type, price_per_unit, quantity, unit, city, images, status, expires_at, created_at, sold_at, removed_reason, carpenters(business_name, is_active)')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('metzion_reports')
      .select('id, listing_id, reason, note, created_at, reporter:carpenters(business_name)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const rows: AdminListing[] = (listings ?? []).map((row) => {
    const owner = row.carpenters as { business_name: string; is_active: boolean } | null
    return {
      id: row.id,
      title: row.title,
      dealType: row.deal_type,
      pricePerUnit: row.price_per_unit == null ? null : Number(row.price_per_unit),
      quantity: Number(row.quantity),
      unit: row.unit,
      city: row.city,
      image: row.images[0] ?? null,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      soldAt: row.sold_at,
      removedReason: row.removed_reason,
      owner: owner?.business_name ?? 'נגרייה שנמחקה',
      ownerActive: owner?.is_active ?? false,
    }
  })

  const open: AdminReport[] = (reports ?? []).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
    reporter: (row.reporter as { business_name: string } | null)?.business_name ?? '—',
  }))

  return <MetzionAdmin listings={rows} reports={open} />
}
