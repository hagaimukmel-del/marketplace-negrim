import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * What the site brings each supplier (product review 2026-11-12, PR 4): how
 * often carpentries saw it and reached out, over the last days. Shown to the
 * supplier in its console ("החשיפה שלך") and to the operator per supplier, so
 * the subscription has numbers behind it.
 *
 * Every source tolerates a database without its migration: a missing table
 * counts as zero, never as an error on the page.
 */

export interface Exposure {
  /** Openings of the supplier's page (supplier_page_views, 20261112100000). */
  pageViews: number
  /** Catalogue searches whose results held one of its products (search_queries, 20261117200000). */
  searchAppearances: number
  /** Openings of the product pages it sells (product_view_days, 20261117200000). */
  productViews: number
  whatsapp: number
  calls: number
  /** In-site questions: conversations a carpentry opened with it, orders and quotes aside. */
  questions: number
  quoteRequests: number
  orders: number
}

export const EXPOSURE_DAYS = 30
/** How far back the monthly chart goes, this month included. */
export const EXPOSURE_MONTHS = 12

/** One calendar month of the chart: "2026-11", what carpentries saw and how often they reached out. */
export interface ExposureMonth {
  month: string
  seen: number
  reached: number
}

export interface ExposureReport {
  /** The last EXPOSURE_DAYS days, per supplier. */
  recent: Map<string, Exposure>
  /** Per supplier, month by month up to this one: from the first month with anything, at least three. */
  months: Map<string, ExposureMonth[]>
}

const EMPTY: Exposure = { pageViews: 0, searchAppearances: 0, productViews: 0, whatsapp: 0, calls: 0, questions: 0, quoteRequests: 0, orders: 0 }
const SEEN: (keyof Exposure)[] = ['pageViews', 'searchAppearances', 'productViews']

const ZONE = 'Asia/Jerusalem'

/** "YYYY-MM-DD" of an instant, in Israel. */
function israelDay(at: Date): string {
  return at.toLocaleDateString('en-CA', { timeZone: ZONE })
}

/** "YYYY-MM" of the month `back` months before this one, in Israel. */
function monthBefore(now: Date, back: number): string {
  const [year, month] = israelDay(now).split('-').map(Number)
  const index = year * 12 + (month - 1) - back
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** One counted thing: whose, which tile, how many, and on which Israeli day. */
interface Hit {
  id: string | null
  key: keyof Exposure
  by: number
  day: string
}

/**
 * What the site brought the given suppliers: the last `EXPOSURE_DAYS` days,
 * and month by month over the last `EXPOSURE_MONTHS` months, keyed by id.
 * Every id given gets a row, zeros included. One read of each source covers both.
 */
export async function loadExposureReport(supplierIds: string[], now = new Date()): Promise<ExposureReport> {
  const ids = [...new Set(supplierIds)]
  const recent = new Map<string, Exposure>(ids.map((id) => [id, { ...EMPTY }]))
  const months = new Map<string, ExposureMonth[]>()
  if (ids.length === 0) return { recent, months }

  const firstMonth = monthBefore(now, EXPOSURE_MONTHS - 1)
  const fromDay = `${firstMonth}-01`
  // A day early, so the first Israeli day of the month is whole whatever the offset.
  const fromIso = new Date(Date.parse(fromDay) - 86_400_000).toISOString()
  const recentDay = israelDay(new Date(now.getTime() - EXPOSURE_DAYS * 86_400_000))

  const supabase = getSupabaseAdmin()
  const [views, searches, offers, clicks, threads, quotes, orders] = await Promise.all([
    supabase.from('supplier_page_views').select('supplier_id, views, day').in('supplier_id', ids).gte('day', fromDay).limit(20000),
    supabase.from('search_queries').select('supplier_ids, created_at').overlaps('supplier_ids', ids).gte('created_at', fromIso).limit(20000),
    supabase.from('supplier_offers').select('supplier_id, product_id').in('supplier_id', ids).limit(20000),
    supabase.from('contact_clicks').select('supplier_id, channel, created_at').in('supplier_id', ids).gte('created_at', fromIso).limit(20000),
    supabase
      .from('message_threads')
      .select('supplier_id, created_at')
      .in('supplier_id', ids)
      .is('order_id', null)
      .is('quote_request_id', null)
      .gte('created_at', fromIso)
      .limit(20000),
    supabase.from('quote_requests').select('supplier_id, created_at').in('supplier_id', ids).gte('created_at', fromIso).limit(20000),
    supabase.from('orders').select('supplier_id, created_at').in('supplier_id', ids).neq('status', 'cancelled').gte('created_at', fromIso).limit(20000),
  ])

  const at = (iso: string | null) => (iso ? israelDay(new Date(iso)) : '')
  const hits: Hit[] = []
  for (const row of views.data ?? []) hits.push({ id: row.supplier_id, key: 'pageViews', by: row.views, day: row.day })
  for (const row of searches.data ?? [])
    for (const id of row.supplier_ids) if (recent.has(id)) hits.push({ id, key: 'searchAppearances', by: 1, day: at(row.created_at) })
  for (const row of clicks.data ?? [])
    hits.push({ id: row.supplier_id, key: row.channel === 'whatsapp' ? 'whatsapp' : 'calls', by: 1, day: at(row.created_at) })
  for (const row of threads.data ?? []) hits.push({ id: row.supplier_id, key: 'questions', by: 1, day: at(row.created_at) })
  for (const row of quotes.data ?? []) hits.push({ id: row.supplier_id, key: 'quoteRequests', by: 1, day: at(row.created_at) })
  for (const row of orders.data ?? []) hits.push({ id: row.supplier_id, key: 'orders', by: 1, day: at(row.created_at) })

  // A product sold by two suppliers counts for each of them.
  const sellers = new Map<string, string[]>()
  for (const row of offers.data ?? []) sellers.set(row.product_id, [...(sellers.get(row.product_id) ?? []), row.supplier_id])
  const productIds = [...sellers.keys()]
  const productDays = productIds.length
    ? await supabase.from('product_view_days').select('product_id, day, views').in('product_id', productIds).gte('day', fromDay).limit(20000)
    : null
  for (const row of productDays?.data ?? [])
    for (const id of sellers.get(row.product_id) ?? []) hits.push({ id, key: 'productViews', by: row.views, day: row.day })

  const byMonth = new Map<string, Map<string, ExposureMonth>>()
  for (const hit of hits) {
    if (!hit.id || !recent.has(hit.id) || hit.day < fromDay) continue
    if (hit.day >= recentDay) recent.get(hit.id)![hit.key] += hit.by
    const month = hit.day.slice(0, 7)
    const perMonth = byMonth.get(hit.id) ?? new Map<string, ExposureMonth>()
    const point = perMonth.get(month) ?? { month, seen: 0, reached: 0 }
    if (SEEN.includes(hit.key)) point.seen += hit.by
    else point.reached += hit.by
    perMonth.set(month, point)
    byMonth.set(hit.id, perMonth)
  }

  const calendar = Array.from({ length: EXPOSURE_MONTHS }, (_, i) => monthBefore(now, EXPOSURE_MONTHS - 1 - i))
  for (const id of ids) {
    const perMonth = byMonth.get(id)
    const first = calendar.findIndex((month) => perMonth?.has(month))
    const start = first === -1 ? EXPOSURE_MONTHS - 3 : Math.min(first, EXPOSURE_MONTHS - 3)
    months.set(id, calendar.slice(start).map((month) => perMonth?.get(month) ?? { month, seen: 0, reached: 0 }))
  }
  return { recent, months }
}

/** The months of several suppliers added together, for the operator's whole-site chart. */
export function sumMonths(series: ExposureMonth[][]): ExposureMonth[] {
  const total = new Map<string, ExposureMonth>()
  for (const points of series)
    for (const point of points) {
      const sum = total.get(point.month) ?? { month: point.month, seen: 0, reached: 0 }
      sum.seen += point.seen
      sum.reached += point.reached
      total.set(point.month, sum)
    }
  return [...total.values()].sort((a, b) => a.month.localeCompare(b.month))
}

/** Cleans a typed search for the log: trimmed, spaces folded, at most 120 characters. */
export function searchLogText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120)
}

/** One catalogue search. Never awaited by the page; a database without the table only loses the row. */
export async function logSearch(entry: { query: string; results: number; supplierIds: string[]; carpenterId: string | null }): Promise<void> {
  const query = searchLogText(entry.query)
  if (!query) return
  await getSupabaseAdmin()
    .from('search_queries')
    .insert({ query, results: entry.results, supplier_ids: [...new Set(entry.supplierIds)], carpenter_id: entry.carpenterId })
}

export interface SearchStat {
  query: string
  count: number
  /** Results the last time it was searched. */
  results: number
}

/** The most searched words over the last `days` days, and those that found nothing. */
export async function loadSearchStats(days = EXPOSURE_DAYS): Promise<{ ready: boolean; total: number; top: SearchStat[]; empty: SearchStat[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from('search_queries')
    .select('query, results, created_at')
    .gte('created_at', new Date(Date.now() - days * 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20000)
  if (error) return { ready: false, total: 0, top: [], empty: [] }
  const byQuery = new Map<string, SearchStat>()
  for (const row of data ?? []) {
    const key = row.query.toLowerCase()
    const stat = byQuery.get(key)
    if (stat) stat.count += 1
    else byQuery.set(key, { query: row.query, count: 1, results: row.results })
  }
  const all = [...byQuery.values()].sort((a, b) => b.count - a.count || a.query.localeCompare(b.query, 'he'))
  return { ready: true, total: (data ?? []).length, top: all.slice(0, 20), empty: all.filter((stat) => stat.results === 0).slice(0, 20) }
}
