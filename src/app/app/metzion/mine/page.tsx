import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import MyListings, { type MyListing } from './MyListings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'המודעות שלי — מציאון' }

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>
}) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) redirect('/app/metzion')

  const [{ created, saved }, { data }] = await Promise.all([
    searchParams,
    getSupabaseAdmin()
      .from('metzion_listings')
      .select('id, title, deal_type, price_per_unit, quantity, unit, images, status, expires_at, created_at, sold_at, removed_reason')
      .eq('carpenter_id', carpenter.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const listings: MyListing[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    dealType: row.deal_type,
    pricePerUnit: row.price_per_unit == null ? null : Number(row.price_per_unit),
    quantity: Number(row.quantity),
    unit: row.unit,
    image: row.images[0] ?? null,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    soldAt: row.sold_at,
    removedByAdmin: Boolean(row.removed_reason?.startsWith('admin')),
  }))

  return <MyListings listings={listings} notice={created ? 'created' : saved ? 'saved' : null} />
}
