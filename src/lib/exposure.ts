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
  /** Openings of the product pages it sells, since counting began (product_view_counts has no dates). */
  productViews: number
  whatsapp: number
  calls: number
  /** In-site questions: conversations a carpentry opened with it, orders and quotes aside. */
  questions: number
  quoteRequests: number
  orders: number
}

export const EXPOSURE_DAYS = 30

const EMPTY: Exposure = { pageViews: 0, searchAppearances: 0, productViews: 0, whatsapp: 0, calls: 0, questions: 0, quoteRequests: 0, orders: 0 }

function since(days: number): { iso: string; day: string } {
  const at = new Date(Date.now() - days * 86_400_000)
  return { iso: at.toISOString(), day: at.toISOString().slice(0, 10) }
}

function add(map: Map<string, Exposure>, id: string | null, key: keyof Exposure, by = 1) {
  if (!id) return
  const row = map.get(id) ?? { ...EMPTY }
  row[key] += by
  map.set(id, row)
}

/**
 * The exposure of the given suppliers over the last `days` days, keyed by id.
 * Every id given gets a row, zeros included.
 */
export async function loadExposure(supplierIds: string[], days = EXPOSURE_DAYS): Promise<Map<string, Exposure>> {
  const ids = [...new Set(supplierIds)]
  const result = new Map<string, Exposure>(ids.map((id) => [id, { ...EMPTY }]))
  if (ids.length === 0) return result

  const supabase = getSupabaseAdmin()
  const from = since(days)
  const [views, searches, offers, clicks, threads, quotes, orders] = await Promise.all([
    supabase.from('supplier_page_views').select('supplier_id, views').in('supplier_id', ids).gte('day', from.day),
    supabase.from('search_queries').select('supplier_ids').overlaps('supplier_ids', ids).gte('created_at', from.iso).limit(20000),
    supabase.from('supplier_offers').select('supplier_id, product_id').in('supplier_id', ids).limit(20000),
    supabase.from('contact_clicks').select('supplier_id, channel').in('supplier_id', ids).gte('created_at', from.iso).limit(20000),
    supabase
      .from('message_threads')
      .select('supplier_id')
      .in('supplier_id', ids)
      .is('order_id', null)
      .is('quote_request_id', null)
      .gte('created_at', from.iso)
      .limit(20000),
    supabase.from('quote_requests').select('supplier_id').in('supplier_id', ids).gte('created_at', from.iso).limit(20000),
    supabase.from('orders').select('supplier_id').in('supplier_id', ids).neq('status', 'cancelled').gte('created_at', from.iso).limit(20000),
  ])

  for (const row of views.data ?? []) add(result, row.supplier_id, 'pageViews', row.views)
  for (const row of searches.data ?? []) for (const id of row.supplier_ids) if (result.has(id)) add(result, id, 'searchAppearances')
  for (const row of clicks.data ?? []) add(result, row.supplier_id, row.channel === 'whatsapp' ? 'whatsapp' : 'calls')
  for (const row of threads.data ?? []) add(result, row.supplier_id, 'questions')
  for (const row of quotes.data ?? []) add(result, row.supplier_id, 'quoteRequests')
  for (const row of orders.data ?? []) add(result, row.supplier_id, 'orders')

  const productIds = [...new Set((offers.data ?? []).map((row) => row.product_id))]
  if (productIds.length) {
    const { data: counts } = await supabase.from('product_view_counts').select('product_id, views').in('product_id', productIds)
    const viewsOf = new Map((counts ?? []).map((row) => [row.product_id, row.views]))
    for (const row of offers.data ?? []) add(result, row.supplier_id, 'productViews', viewsOf.get(row.product_id) ?? 0)
  }
  return result
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
    .gte('created_at', since(days).iso)
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
