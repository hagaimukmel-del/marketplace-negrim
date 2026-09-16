import Link from 'next/link'
import { Lock, Recycle } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import type { DealType, MetzionCard } from '@/lib/metzion'
import MetzionBoard from './MetzionBoard'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'מציאון — שוק הנגרים' }

/**
 * The board. Behind registration like the prices: phones and addresses on an
 * open page are there for anyone to collect, and the board is for carpenters.
 *
 * Only live listings are read — active, not past their 60 days, and posted by a
 * carpenter who is not blocked. A blocked carpenter's listings leave with them.
 */
export default async function MetzionPage() {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])

  if (!carpenter && !admin) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Recycle size={28} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">מציאון</h1>
        <p className="mx-auto mt-2 max-w-md text-stone-600">
          חומר שנשאר, פרזול עודף, מכונה שכבר לא צריך — אל תזרוק. נגר אחר אולי מחפש בדיוק את זה.
          למכירה או למסירה בחינם, ישירות בין נגרים.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-700">
          <Lock size={14} />
          המציאון פתוח לנגריות רשומות
        </p>
        <div className="mt-5">
          <Link href="/join" className="inline-flex h-12 items-center rounded-lg bg-emerald-700 px-6 font-bold text-white">
            הרשמה — פחות מדקה
          </Link>
        </div>
      </div>
    )
  }

  const { data } = await getSupabaseAdmin()
    .from('metzion_listings')
    .select(
      'id, title, description, category, condition, deal_type, quantity, unit, price_per_unit, city, regions, images, created_at, expires_at, carpenter_id, carpenters!inner(is_active)'
    )
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .eq('carpenters.is_active', true)
    .order('created_at', { ascending: false })
    .limit(500)

  const cards: MetzionCard[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    dealType: row.deal_type as DealType,
    quantity: Number(row.quantity),
    unit: row.unit,
    pricePerUnit: row.price_per_unit == null ? null : Number(row.price_per_unit),
    city: row.city,
    regions: row.regions,
    images: row.images,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    mine: carpenter?.id === row.carpenter_id,
  }))

  return <MetzionBoard cards={cards} canPost={Boolean(carpenter)} />
}
