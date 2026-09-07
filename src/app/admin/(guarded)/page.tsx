import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatIls } from '@/lib/vat'

export const dynamic = 'force-dynamic'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-stone-300 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}

/**
 * Campaign results.
 *
 * The numbers that were guessed at before: how many of the list opened their
 * link, how many put something in the basket, how many sent an order, and what
 * it was worth. Revenue is shown excluding VAT, because that is what the order
 * stores and what a margin is calculated from.
 */
export default async function AdminHome() {
  const supabase = getSupabaseAdmin()

  const [
    { count: carpenterCount },
    { count: openedCount },
    { data: campaigns },
    { data: orders },
    { data: events },
    { data: intents },
  ] = await Promise.all([
    supabase.from('carpenters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('carpenters')
      .select('id', { count: 'exact', head: true })
      .not('first_seen_at', 'is', null),
    supabase
      .from('campaigns')
      .select('id, name, kind, is_active, created_at, products(name_he)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('orders').select('campaign_id, carpenter_id, subtotal_excl_vat, order_items(id)'),
    supabase.from('offer_events').select('campaign_id, carpenter_id, event_type'),
    supabase
      .from('order_intents')
      .select('quantity, status, products(name_he), carpenters(business_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const perCampaign = (campaigns ?? []).map((campaign) => {
    const campaignEvents = (events ?? []).filter((e) => e.campaign_id === campaign.id)
    const campaignOrders = (orders ?? []).filter((o) => o.campaign_id === campaign.id)

    const uniqueBy = (type: string) =>
      new Set(
        campaignEvents.filter((e) => e.event_type === type).map((e) => e.carpenter_id)
      ).size

    const revenue = campaignOrders.reduce((sum, o) => sum + Number(o.subtotal_excl_vat), 0)
    const lines = campaignOrders.reduce((sum, o) => sum + (o.order_items?.length ?? 0), 0)

    return {
      id: campaign.id,
      product: campaign.products?.name_he ?? '—',
      kind: campaign.kind,
      isActive: campaign.is_active,
      opened: uniqueBy('offer_opened'),
      added: uniqueBy('item_added'),
      orders: campaignOrders.length,
      revenue,
      avgOrder: campaignOrders.length ? revenue / campaignOrders.length : 0,
      avgLines: campaignOrders.length ? lines / campaignOrders.length : 0,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-stone-900">תוצאות</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="נגריות ברשימה" value={String(carpenterCount ?? 0)} />
        <Stat
          label="פתחו לינק"
          value={String(openedCount ?? 0)}
          hint={
            carpenterCount
              ? `${(((openedCount ?? 0) / carpenterCount) * 100).toFixed(1)}% מהרשימה`
              : undefined
          }
        />
        <Stat label="הזמנות" value={String((orders ?? []).length)} />
      </div>

      <section className="overflow-hidden rounded-xl border border-stone-300 bg-white">
        <h2 className="border-b border-stone-200 p-4 font-bold text-stone-900">לפי קמפיין</h2>
        {perCampaign.length === 0 ? (
          <p className="p-6 text-sm text-stone-600">אין עדיין קמפיינים.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="p-3 text-start font-medium">מוצר</th>
                  <th className="p-3 text-start font-medium">סוג</th>
                  <th className="p-3 text-start font-medium">פתחו</th>
                  <th className="p-3 text-start font-medium">הוסיפו</th>
                  <th className="p-3 text-start font-medium">הזמינו</th>
                  <th className="p-3 text-start font-medium">מכירות</th>
                  <th className="p-3 text-start font-medium">₪ להזמנה</th>
                  <th className="p-3 text-start font-medium">שורות</th>
                </tr>
              </thead>
              <tbody>
                {perCampaign.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="p-3 font-medium text-stone-900">
                      {row.product}
                      {row.isActive && (
                        <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          פעיל
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-stone-600">
                      {row.kind === 'introduction' ? 'היכרות' : row.kind === 'discount' ? 'מבצע' : 'חידוש'}
                    </td>
                    <td className="p-3 tabular-nums">{row.opened}</td>
                    <td className="p-3 tabular-nums">{row.added}</td>
                    <td className="p-3 tabular-nums font-semibold">{row.orders}</td>
                    <td className="p-3 tabular-nums">{formatIls(row.revenue)}</td>
                    <td className="p-3 tabular-nums">{formatIls(row.avgOrder)}</td>
                    <td className="p-3 tabular-nums">{row.avgLines.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-stone-200 p-3 text-xs text-stone-500">
              המדד שפתוח לשיפור הוא ₪ להזמנה ומספר השורות — ההמרה כבר קרובה לתקרה שלה.
            </p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-300 bg-white">
        <h2 className="border-b border-stone-200 p-4 font-bold text-stone-900">
          בקשות למחיר שממתינות
        </h2>
        {(intents ?? []).length === 0 ? (
          <p className="p-6 text-sm text-stone-600">אין בקשות פתוחות.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {(intents ?? []).map((intent, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <span className="font-semibold text-stone-900">
                  {intent.carpenters?.business_name ?? '—'}
                </span>
                <span className="text-stone-600">{intent.products?.name_he ?? '—'}</span>
                <span className="ms-auto font-bold tabular-nums text-stone-900">
                  {intent.quantity} יח׳
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
