import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { AppProduct } from '@/lib/app/products'
import type { PromotedSlot } from '@/components/app/PromotedCard'
import { addDays, currentWeek, type PromoResults, type PromoStatus, type PromoWeek } from '@/lib/promo-weeks'

/**
 * "מוצר השבוע" on the server (T-024): the week running now, bookings, and
 * what each week did.
 *
 * Every read tolerates the tables being absent (migration 20261011130000):
 * no current promotion, and `ready: false` for the screens that book weeks.
 */

export interface CurrentPromo {
  id: string
  productId: string
  supplierId: string
}

/** The approved booking for the week running now, if any. */
export async function loadCurrentPromo(now: Date = new Date()): Promise<CurrentPromo | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('promo_weeks')
    .select('id, product_id, supplier_id')
    .eq('week_start', currentWeek(now))
    .eq('status', 'approved')
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id, productId: data.product_id, supplierId: data.supplier_id }
}

/** Midnight at the start of this Israeli date, as an instant. Follows summer time. */
export function israelMidnight(date: string): Date {
  const probe = new Date(`${date}T12:00:00Z`)
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'longOffset' })
      .formatToParts(probe)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '+02:00'
  return new Date(`${date}T00:00:00${offset}`)
}

interface Row {
  id: string
  week_start: string
  supplier_id: string
  product_id: string
  status: string
  price_excl_vat: number
  note: string | null
}

/**
 * Bookings between two week starts (inclusive), newest week first, with
 * supplier and product names and, for weeks that have begun, their results.
 */
export async function loadPromoWeeks(opts: {
  from: string
  to: string
  supplierId?: string
  statuses?: PromoStatus[]
}): Promise<{ ready: boolean; weeks: PromoWeek[] }> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('promo_weeks')
    .select('id, week_start, supplier_id, product_id, status, price_excl_vat, note')
    .gte('week_start', opts.from)
    .lte('week_start', opts.to)
    .order('week_start', { ascending: false })
    .limit(500)
  if (opts.supplierId) query = query.eq('supplier_id', opts.supplierId)
  if (opts.statuses) query = query.in('status', opts.statuses)
  const { data, error } = await query
  if (error) return { ready: false, weeks: [] }

  const rows = (data ?? []) as Row[]
  const productIds = [...new Set(rows.map((row) => row.product_id))]
  const supplierIds = [...new Set(rows.map((row) => row.supplier_id))]
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, name_he').in('id', productIds)
      : Promise.resolve({ data: [] as { id: string; name_he: string }[] }),
    supplierIds.length
      ? supabase.from('suppliers').select('id, company_name').in('id', supplierIds)
      : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
  ])
  const productName = new Map((products ?? []).map((row) => [row.id, row.name_he]))
  const supplierName = new Map((suppliers ?? []).map((row) => [row.id, row.company_name]))

  const started = rows.filter((row) => row.status === 'approved' && row.week_start <= currentWeek())
  const results = await promoResults(started)

  return {
    ready: true,
    weeks: rows.map((row) => ({
      id: row.id,
      weekStart: row.week_start,
      supplierId: row.supplier_id,
      supplierName: supplierName.get(row.supplier_id) ?? null,
      productId: row.product_id,
      productName: productName.get(row.product_id) ?? null,
      status: row.status as PromoStatus,
      price: Number(row.price_excl_vat),
      note: row.note,
      results: results.get(row.id) ?? null,
    })),
  }
}

/**
 * What each week did: views and adds on the promoted card (and views in the
 * agent), and orders for that product from that supplier during the week,
 * excluding cancelled ones, at the submitted line amounts excl. VAT.
 */
async function promoResults(rows: Row[]): Promise<Map<string, PromoResults>> {
  const out = new Map<string, PromoResults>()
  if (rows.length === 0) return out
  const supabase = getSupabaseAdmin()

  const { data: events } = await supabase
    .from('promo_events')
    .select('promo_week_id, kind, carpenter_id')
    .in('promo_week_id', rows.map((row) => row.id))
    .limit(50000)

  for (const row of rows) out.set(row.id, { views: 0, viewers: 0, adds: 0, orders: 0, amount: 0 })
  const viewers = new Map<string, Set<string>>()
  for (const event of events ?? []) {
    const result = out.get(event.promo_week_id)
    if (!result) continue
    if (event.kind === 'add') result.adds += 1
    if (event.kind === 'view') {
      result.views += 1
      if (event.carpenter_id) {
        const set = viewers.get(event.promo_week_id) ?? new Set<string>()
        set.add(event.carpenter_id)
        viewers.set(event.promo_week_id, set)
      }
    }
  }
  for (const [id, set] of viewers) out.get(id)!.viewers = set.size

  await Promise.all(
    rows.map(async (row) => {
      const { data: lines } = await supabase
        .from('order_items')
        .select('order_id, line_total_excl_vat, orders!inner(status)')
        .eq('product_id', row.product_id)
        .eq('supplier_id', row.supplier_id)
        .gte('created_at', israelMidnight(row.week_start).toISOString())
        .lt('created_at', israelMidnight(addDays(row.week_start, 7)).toISOString())
        .neq('orders.status', 'cancelled')
        .limit(1000)
      const result = out.get(row.id)!
      result.orders = new Set((lines ?? []).map((line) => line.order_id)).size
      result.amount = Math.round((lines ?? []).reduce((sum, line) => sum + Number(line.line_total_excl_vat), 0) * 100) / 100
    })
  )
  return out
}

/** Best-effort: a lost count never breaks the page that showed the card. */
export async function recordPromoEvent(event: {
  weekId: string
  kind: 'view' | 'add'
  placement: 'home' | 'category' | 'agent'
  carpenterId: string | null
}) {
  const { error } = await getSupabaseAdmin().from('promo_events').insert({
    promo_week_id: event.weekId,
    kind: event.kind,
    placement: event.placement,
    carpenter_id: event.carpenterId,
  })
  if (error) console.error('Promo event not recorded:', error.message)
}

/**
 * The card for this week's promotion, from products the page already loaded.
 * Null when there is none, or the product or the supplier's offer is no longer
 * live: a promotion never shows something a carpenter cannot order.
 */
export function promotedSlot(products: AppProduct[], promo: CurrentPromo | null): PromotedSlot | null {
  if (!promo) return null
  const product = products.find((item) => item.id === promo.productId)
  const offer = product?.offers.find((item) => item.supplierId === promo.supplierId)
  return product && offer ? { weekId: promo.id, product, offer } : null
}
