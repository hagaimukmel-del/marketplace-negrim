import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import MyListings, { type MyListing } from '@/app/app/metzion/mine/MyListings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'המציאון — ממשק הספק' }

/**
 * A supplier's own listings on המציאון: end-of-line stock, a returned machine,
 * a damaged carton sold cheap. Same board as the carpenters', same screen as
 * their "my listings", marked on the board as a supplier's.
 */
export default async function SupplierMetzionPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>
}) {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')

  const [{ created, saved }, { data }] = await Promise.all([
    searchParams,
    getSupabaseAdmin()
      .from('metzion_listings')
      .select('id, title, deal_type, price_per_unit, quantity, unit, images, status, expires_at, created_at, sold_at, removed_reason')
      .eq('supplier_id', supplier.id)
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

  return (
    <div className="space-y-3">
      <p className="rounded-[11px] border border-hair bg-white p-3 text-sm text-muted">
        המציאון הוא לוח שבו נגריות מוסרות ומוכרות זו לזו חומר עודף, פרזול ומכונות. גם ספק יכול לפרסם בו:
        סוף סדרה, אריזה פגומה, מכונה שחזרה. המודעה מופיעה לנגריות הרשומות עם סימון &quot;ספק&quot;, והן פונות
        אליך ישירות בטלפון או בוואטסאפ. אין תשלום דרך האתר.
      </p>
      <MyListings listings={listings} notice={created ? 'created' : saved ? 'saved' : null} side="supplier" />
    </div>
  )
}
