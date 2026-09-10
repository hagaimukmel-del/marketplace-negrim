import Link from 'next/link'
import { ExternalLink, Link2, ShoppingCart, Store, ClipboardList, UserPlus } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatIls } from '@/lib/vat'
import { statusInfo } from '@/lib/order-status'
import ViewPicker from '../ViewPicker'

export const dynamic = 'force-dynamic'

interface OrderRow {
  id: string
  order_number: string
  status: string
  created_at: string
  subtotal_excl_vat: number
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Every screen a carpenter can reach, in the order they reach them.
 *
 * The links open the real pages rather than a mock-up, so what you see is what
 * the carpenter gets — including the personal offer link, which is the whole
 * identity model: no login, the link is the account. Opening it here marks the
 * carpenter as having seen their offer, which is why it says so.
 */
export default async function CarpenterViewPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { c } = await searchParams
  const supabase = getSupabaseAdmin()

  const { data: carpenters } = await supabase
    .from('carpenters')
    .select('id, token, business_name, contact_name, phone, city, first_seen_at, source')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(500)

  const list = carpenters ?? []
  const carpenter = list.find((row) => row.id === c) ?? list[0] ?? null

  const { data: orders } = carpenter
    ? await supabase
        .from('orders')
        .select('id, order_number, status, created_at, subtotal_excl_vat')
        .eq('carpenter_id', carpenter.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const orderRows = (orders ?? []) as OrderRow[]

  // The public pages, which look the same to everyone.
  const publicPages = [
    { href: '/carpenter/catalog', label: 'קטלוג', icon: Store, note: 'החיפוש, המחירים, הוספה לעגלה' },
    { href: '/carpenter/cart', label: 'עגלה', icon: ShoppingCart, note: 'ריקה עד שמוסיפים משהו' },
    { href: '/carpenter/orders', label: 'ההזמנות שלי', icon: ClipboardList, note: 'דורש קישור אישי' },
    { href: '/join', label: 'הרשמת נגרייה', icon: UserPlus, note: 'הטופס שנגר חדש ממלא' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">האתר כפי שנגר רואה</h1>
        <p className="mt-1 text-sm text-stone-600">
          הקישורים פותחים את הדפים האמיתיים, לא הדמיה. מה שתראה כאן זה מה שהנגר מקבל.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-stone-900">דפים פתוחים לכולם</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {publicPages.map((page) => (
            <a
              key={page.href}
              href={page.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400"
            >
              <page.icon size={18} className="mt-0.5 shrink-0 text-stone-400" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-stone-900">
                  {page.label}
                  <ExternalLink size={13} className="text-stone-400" />
                </span>
                <span className="mt-0.5 block text-xs text-stone-500">{page.note}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-stone-900">הדף האישי של נגרייה</h2>

        {list.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            אין עדיין נגריות במערכת.{' '}
            <Link href="/admin/carpenters" className="text-emerald-700 underline">
              לייבוא נגריות
            </Link>
          </p>
        ) : (
          <>
            <ViewPicker
              label="נגרייה"
              param="c"
              current={carpenter!.id}
              options={list.map((row) => ({
                id: row.id,
                label: row.city ? `${row.business_name} · ${row.city}` : row.business_name,
              }))}
            />

            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-stone-900">{carpenter!.business_name}</p>
                  <p className="text-sm text-stone-500">
                    {carpenter!.contact_name && `${carpenter!.contact_name} · `}
                    <span className="tnum">{carpenter!.phone}</span>
                    {carpenter!.source === 'self' && ' · נרשם לבד'}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {carpenter!.first_seen_at
                      ? `פתח את הקישור לראשונה ב-${formatDate(carpenter!.first_seen_at)}`
                      : 'עוד לא פתח את הקישור'}
                  </p>
                </div>

                <a
                  href={`/o/${carpenter!.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
                >
                  <ExternalLink size={16} />
                  פתח את הדף שלו
                </a>
              </div>

              <p className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                <Link2 size={14} className="mt-0.5 shrink-0 text-stone-400" />
                <span className="min-w-0 break-all font-mono">/o/{carpenter!.token}</span>
              </p>

              <p className="mt-2 text-xs text-stone-500">
                אין סיסמה — הקישור הוא החשבון. פתיחה שלו מכאן נרשמת כאילו הנגר פתח אותו, אז
                ה״נצפה לראשונה״ שלו ישתנה.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-bold text-stone-900">ההזמנות שהוא רואה ({orderRows.length})</p>
              {orderRows.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">עוד לא הזמין.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {orderRows.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="tnum font-mono text-xs text-stone-500">
                        {order.order_number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          statusInfo(order.status).className
                        }`}
                      >
                        {statusInfo(order.status).label}
                      </span>
                      <span className="text-xs text-stone-400">{formatDate(order.created_at)}</span>
                      <span className="tnum ms-auto font-semibold text-stone-900">
                        {formatIls(order.subtotal_excl_vat)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
