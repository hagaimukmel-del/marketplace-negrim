import Link from 'next/link'
import { ExternalLink, UserPlus, Store } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * The supplier console as a supplier sees it — the real one, not a preview.
 *
 * This used to be a read-only mock-up built before suppliers could sign in. Now
 * they can, so the honest view is their actual console: opening a supplier's
 * entry link here signs this browser in as that supplier. The console then
 * shows a banner saying whose it is, and skips the terms prompt, so the operator
 * never accepts anything on a supplier's behalf.
 */
export default async function SupplierViewPage() {
  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select('id, company_name, city, status, token, logo_url')
    .in('status', ['approved', 'blocked'])
    .order('company_name')

  const suppliers = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">האתר כפי שספק רואה</h1>
        <p className="mt-1 text-sm text-stone-600">
          כל כפתור פותח את הממשק האמיתי של הספק בלשונית חדשה. מה שתשנה שם נשמר אצלו — זה לא הדמיה.
        </p>
      </div>

      <a
        href="/supplier/join"
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400"
      >
        <UserPlus size={18} className="mt-0.5 shrink-0 text-stone-400" />
        <span>
          <span className="flex items-center gap-1.5 font-semibold text-stone-900">
            דף ההרשמה לספקים
            <ExternalLink size={13} className="text-stone-400" />
          </span>
          <span className="mt-0.5 block text-xs text-stone-500">מה שספק חדש רואה לפני שאישרת אותו</span>
        </span>
      </a>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-900">הממשק של ספק מאושר</h2>
        {suppliers.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            אין עדיין ספקים מאושרים.{' '}
            <Link href="/admin/suppliers" className="text-emerald-700 underline">
              לספקים
            </Link>
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center gap-3 border-b border-stone-100 p-3 last:border-b-0"
              >
                {supplier.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={supplier.logo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg border border-stone-200 object-contain p-0.5"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                    <Store size={17} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-stone-900">{supplier.company_name}</span>
                  <span className="block text-xs text-stone-500">
                    {supplier.city ?? 'ללא עיר'}
                    {supplier.status === 'blocked' && ' · חסום — לא יכול להיכנס'}
                  </span>
                </span>
                {supplier.status === 'approved' && supplier.token ? (
                  <a
                    href={`/supplier/enter/${supplier.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white"
                  >
                    <ExternalLink size={15} />
                    פתח כספק
                  </a>
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-stone-500">
          הכניסה נשמרת בדפדפן הזה. כדי לחזור להיות ״אף ספק״ — לחץ יציאה בתוך הממשק של הספק.
        </p>
      </section>
    </div>
  )
}
