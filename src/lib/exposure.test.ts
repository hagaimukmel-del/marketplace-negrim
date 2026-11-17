import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Each table answers with the rows set here; a table set to an error answers { error }. */
const tables = vi.hoisted(() => ({ rows: {} as Record<string, unknown[] | 'error'>, inserts: [] as unknown[] }))

function query(table: string): unknown {
  const q: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'neq', 'in', 'is', 'gte', 'lt', 'or', 'order', 'limit', 'overlaps']) q[name] = () => q
  q.insert = async (row: unknown) => {
    tables.inserts.push(row)
    return { error: null }
  }
  q.then = (resolve: (value: unknown) => unknown) => {
    const rows = tables.rows[table]
    return resolve(rows === 'error' ? { data: null, error: { message: 'missing' } } : { data: rows ?? [], error: null })
  }
  return q
}
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: (table: string) => query(table) }) }))

const { loadExposureReport, loadSearchStats, sumMonths, logSearch, searchLogText } = await import('./exposure')

beforeEach(() => {
  tables.rows = {}
  tables.inserts = []
})

describe('loadExposureReport', () => {
  // 17.11.2026, 22:00 in Israel.
  const now = new Date('2026-11-17T20:00:00Z')

  it('adds up each source per supplier over 30 days, zeros for a supplier with nothing', async () => {
    tables.rows = {
      supplier_page_views: [{ supplier_id: 'A', views: 4, day: '2026-11-15' }, { supplier_id: 'A', views: 2, day: '2026-11-01' }],
      search_queries: [{ supplier_ids: ['A', 'B'], created_at: '2026-11-16T10:00:00Z' }, { supplier_ids: ['A', 'X'], created_at: '2026-11-10T10:00:00Z' }],
      supplier_offers: [{ supplier_id: 'A', product_id: 'p1' }, { supplier_id: 'B', product_id: 'p1' }],
      product_view_days: [{ product_id: 'p1', day: '2026-11-02', views: 5 }, { product_id: 'p1', day: '2026-11-17', views: 4 }],
      contact_clicks: [{ supplier_id: 'A', channel: 'whatsapp', created_at: '2026-11-12T08:00:00Z' }, { supplier_id: 'A', channel: 'phone', created_at: '2026-11-12T08:00:00Z' }],
      message_threads: [{ supplier_id: 'B', created_at: '2026-11-03T08:00:00Z' }],
      quote_requests: [{ supplier_id: 'A', created_at: '2026-11-03T08:00:00Z' }],
      orders: [{ supplier_id: 'A', created_at: '2026-11-04T08:00:00Z' }, { supplier_id: 'A', created_at: '2026-11-05T08:00:00Z' }],
    }
    const { recent } = await loadExposureReport(['A', 'B', 'C'], now)
    expect(recent.get('A')).toEqual({ pageViews: 6, searchAppearances: 2, productViews: 9, whatsapp: 1, calls: 1, questions: 0, quoteRequests: 1, orders: 2 })
    expect(recent.get('B')).toMatchObject({ searchAppearances: 1, productViews: 9, questions: 1 })
    expect(recent.get('C')).toEqual({ pageViews: 0, searchAppearances: 0, productViews: 0, whatsapp: 0, calls: 0, questions: 0, quoteRequests: 0, orders: 0 })
  })

  it('older than 30 days counts in its month only', async () => {
    tables.rows = {
      supplier_page_views: [{ supplier_id: 'A', views: 3, day: '2026-09-20' }, { supplier_id: 'A', views: 1, day: '2026-11-17' }],
      orders: [{ supplier_id: 'A', created_at: '2026-09-30T22:30:00Z' }],
    }
    const { recent, months } = await loadExposureReport(['A'], now)
    expect(recent.get('A')?.pageViews).toBe(1)
    expect(recent.get('A')?.orders).toBe(0)
    // 30.09 at 22:30 UTC is already 1 October in Israel.
    expect(months.get('A')).toEqual([
      { month: '2026-09', seen: 3, reached: 0 },
      { month: '2026-10', seen: 0, reached: 1 },
      { month: '2026-11', seen: 1, reached: 0 },
    ])
  })

  it('months start at the first month with anything, at least three, across a year', async () => {
    tables.rows = { supplier_page_views: [{ supplier_id: 'A', views: 2, day: '2025-12-05' }] }
    const { months } = await loadExposureReport(['A', 'B'], now)
    expect(months.get('A')?.map((m) => m.month)).toEqual([
      '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
    ])
    expect(months.get('B')?.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(sumMonths([months.get('A')!, months.get('B')!])[0]).toEqual({ month: '2025-12', seen: 2, reached: 0 })
  })

  it('a missing table counts as zero, not an error', async () => {
    tables.rows = { search_queries: 'error', supplier_page_views: 'error', product_view_days: 'error' }
    const { recent } = await loadExposureReport(['A'], now)
    expect(recent.get('A')?.searchAppearances).toBe(0)
  })
})

describe('search log', () => {
  it('cleans the words and keeps each supplier once', async () => {
    expect(searchLogText('  דבק \n  לעץ ')).toBe('דבק לעץ')
    expect(searchLogText('x'.repeat(200))).toHaveLength(120)
    await logSearch({ query: ' דבק ', results: 2, supplierIds: ['A', 'A', 'B'], carpenterId: null })
    expect(tables.inserts).toEqual([{ query: 'דבק', results: 2, supplier_ids: ['A', 'B'], carpenter_id: null }])
  })

  it('an empty search is not logged', async () => {
    await logSearch({ query: '   ', results: 0, supplierIds: [], carpenterId: null })
    expect(tables.inserts).toEqual([])
  })

  it('stats: most searched first, searches with no results apart', async () => {
    tables.rows = {
      search_queries: [
        { query: 'דבק', results: 3 },
        { query: 'Blum', results: 0 },
        { query: 'דבק', results: 3 },
        { query: 'blum', results: 0 },
        { query: 'פורמייקה', results: 0 },
      ],
    }
    const stats = await loadSearchStats()
    expect(stats.total).toBe(5)
    expect(stats.top.map((s) => [s.query, s.count])).toEqual([['דבק', 2], ['Blum', 2], ['פורמייקה', 1]])
    expect(stats.empty.map((s) => s.query)).toEqual(['Blum', 'פורמייקה'])
  })

  it('stats before the migration say so', async () => {
    tables.rows = { search_queries: 'error' }
    expect((await loadSearchStats()).ready).toBe(false)
  })
})
