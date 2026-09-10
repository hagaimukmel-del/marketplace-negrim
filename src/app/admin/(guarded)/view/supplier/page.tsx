import Link from 'next/link'
import { AlertTriangle, Package, Truck, Clock, MapPin } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatIls } from '@/lib/vat'
import { unitLabel } from '@/lib/catalog'
import { statusInfo } from '@/lib/order-status'
import ViewPicker from '../ViewPicker'

export const dynamic = 'force-dynamic'

interface OfferRow {
  id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  is_active: boolean
  products: { name_he: string; base_unit: string } | null
}

interface LineRow {
  id: string
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
  orders: {
    id: string
    order_number: string
    status: string
    created_at: string
    business_name: string | null
    customer_name: string | null
    customer_phone: string | null
  } | null
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * The console as one supplier will see it.
 *
 * Supplier login does not exist yet, so this is the operator looking through a
 * supplier's eyes rather than a supplier looking at their own screen — and the
 * page says so, because a preview that pretends to be the real thing is how you
 * end up shipping a screen nobody can actually reach.
 *
 * Everything below is real data filtered to one supplier: the orders waiting on
 * them, the offers they publish, and the terms carpenters are held to. When
 * supplier accounts land, this is the page that goes behind that login.
 */
export default async function SupplierViewPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = getSupabaseAdmin()

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, status, min_order_value_excl_vat, default_lead_time_days, pickup_address'
    )
    .order('company_name')

  const list = suppliers ?? []
  const supplier = list.find((row) => row.id === s) ?? list[0] ?? null

  if (!supplier) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
        <p className="font-semibold text-stone-900">אין עדיין ספקים במערכת.</p>
        <Link href="/admin/suppliers" className="mt-2 inline-block text-sm text-emerald-700 underline">
          למסך הספקים
        </Link>
      </div>
    )
  }

  const [{ data: offers }, { data: lines }] = await Promise.all([
    supabase
      .from('supplier_offers')
      .select(
        'id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, is_active, products(name_he, base_unit)'
      )
      .eq('supplier_id', supplier.id)
      .limit(500),
    supabase
      .from('order_items')
      .select(
        'id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, ' +
          'orders(id, order_number, status, created_at, business_name, customer_name, customer_phone)'
      )
      .eq('supplier_id', supplier.id)
      .limit(500),
  ])

  const offerRows = ((offers ?? []) as unknown as OfferRow[])
    .slice()
    .sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return Number(b.price_excl_vat) - Number(a.price_excl_vat)
    })

  // Only this supplier's lines, grouped into the order each belongs to — which
  // is what a purchase order per supplier will look like once a cart splits.
  const byOrder = new Map<
    string,
    { order: NonNullable<LineRow['orders']>; lines: LineRow[]; total: number }
  >()

  for (const line of (lines ?? []) as unknown as LineRow[]) {
    if (!line.orders) continue
    const existing = byOrder.get(line.orders.id)
    if (existing) {
      existing.lines.push(line)
      existing.total += Number(line.line_total_excl_vat)
    } else {
      byOrder.set(line.orders.id, {
        order: line.orders,
        lines: [line],
        total: Number(line.line_total_excl_vat),
      })
    }
  }

  const orders = [...byOrder.values()].sort(
    (a, b) => new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime()
  )
  const waiting = orders.filter((entry) => entry.order.status === 'pending')
  const liveOffers = offerRows.filter((offer) => offer.is_active)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">האתר כפי שספק רואה</h1>
        <p className="mt-1 text-sm text-stone-600">
          נתונים אמיתיים, מסוננים לספק אחד. זה המסך שיעבור מאחורי כניסת ספק כשהיא תיבנה.
        </p>
      </div>

      <ViewPicker
        label="ספק"
        param="s"
        current={supplier.id}
        options={list.map((row) => ({
          id: row.id,
          label: row.status === 'approved' ? row.company_name : `${row.company_name} (${row.status})`,
        }))}
      />

      <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <span>
          לספק עדיין אין כניסה למערכת — הוא לא יכול להגיע למסך הזה בעצמו. זו תצוגה שלך.
        </span>
      </p>

      {/* Three numbers, because they are the three questions a supplier opens
          the console with. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">הזמנות שמחכות לי</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">{waiting.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">מוצרים שאני מוכר</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">{liveOffers.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">סך ההזמנות שקיבלתי</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">
            {formatIls(orders.reduce((sum, entry) => sum + entry.total, 0))}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Truck size={16} className="text-stone-400" />
          ההזמנות שלי ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            עוד לא הגיעו הזמנות לספק הזה.
          </p>
        ) : (
          orders.map((entry) => (
            <div
              key={entry.order.id}
              className={`rounded-xl border bg-white p-4 ${
                entry.order.status === 'pending' ? 'border-amber-300' : 'border-stone-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-stone-900">
                    {entry.order.business_name || entry.order.customer_name || 'ללא שם'}
                  </p>
                  <p className="tnum text-xs text-stone-500">
                    {entry.order.order_number} · {formatDate(entry.order.created_at)}
                    {entry.order.customer_phone && ` · ${entry.order.customer_phone}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusInfo(entry.order.status).className
                  }`}
                >
                  {statusInfo(entry.order.status).label}
                </span>
              </div>

              <ul className="mt-3 space-y-1">
                {entry.lines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-3 text-sm text-stone-700">
                    <span className="min-w-0 truncate">
                      {line.product_name_he}
                      <span className="tnum text-stone-400"> × {line.quantity}</span>
                    </span>
                    <span className="tnum shrink-0">{formatIls(line.line_total_excl_vat)}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 border-t border-stone-200 pt-2 text-end text-sm font-bold text-stone-900">
                <span className="tnum">{formatIls(entry.total)}</span>
                <span className="ms-1 text-xs font-normal text-stone-500">ללא מע״מ · השורות שלי</span>
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Package size={16} className="text-stone-400" />
          הקטלוג שלי ({offerRows.length})
        </h2>

        {offerRows.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            הספק הזה עוד לא העלה מוצרים.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-stone-200 text-start text-xs text-stone-500">
                <tr>
                  <th className="p-3 text-start font-medium">מוצר</th>
                  <th className="p-3 text-start font-medium">מק״ט</th>
                  <th className="p-3 text-start font-medium">אריזה</th>
                  <th className="p-3 text-end font-medium">מחיר</th>
                  <th className="p-3 text-end font-medium">מלאי</th>
                </tr>
              </thead>
              <tbody>
                {offerRows.map((offer) => (
                  <tr
                    key={offer.id}
                    className={`border-b border-stone-100 last:border-b-0 ${
                      offer.is_active ? '' : 'text-stone-400'
                    }`}
                  >
                    <td className="p-3 font-medium">
                      {offer.products?.name_he ?? '—'}
                      {!offer.is_active && <span className="ms-2 text-xs">(לא פעיל)</span>}
                    </td>
                    <td className="tnum p-3 font-mono text-xs">{offer.supplier_sku ?? '—'}</td>
                    <td className="p-3 text-xs">
                      {offer.pack_label
                        ? `${offer.pack_label}${
                            offer.pack_qty
                              ? ` ${offer.pack_qty} ${unitLabel(offer.products?.base_unit)}`
                              : ''
                          }`
                        : '—'}
                    </td>
                    <td className="tnum p-3 text-end font-semibold">
                      {formatIls(offer.price_excl_vat)}
                      <span className="block text-xs font-normal text-stone-400">
                        ל{unitLabel(offer.products?.base_unit)}
                      </span>
                    </td>
                    <td className="tnum p-3 text-end">{offer.stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Clock size={16} className="text-stone-400" />
          התנאים שלי
        </h2>
        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-stone-500">מינימום הזמנה</p>
            <p className="tnum mt-0.5 font-semibold text-stone-900">
              {supplier.min_order_value_excl_vat
                ? formatIls(supplier.min_order_value_excl_vat)
                : 'לא הוגדר'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">זמן אספקה</p>
            <p className="mt-0.5 font-semibold text-stone-900">
              {supplier.default_lead_time_days != null
                ? `${supplier.default_lead_time_days} ימים`
                : 'לא הוגדר'}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={12} />
              נקודת איסוף
            </p>
            <p className="mt-0.5 font-semibold text-stone-900">
              {supplier.pickup_address || 'לא הוגדרה'}
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          שלושת אלה עדיין לא ניתנים לעריכה בשום מסך — הם נכנסו לסכימה ומחכים לקונסולת הספק.
          המינימום הוא מה שיוצג לנגר בעגלה.
        </p>
      </section>
    </div>
  )
}
