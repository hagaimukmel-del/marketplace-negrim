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

const { loadExposure, loadSearchStats, logSearch, searchLogText } = await import('./exposure')

beforeEach(() => {
  tables.rows = {}
  tables.inserts = []
})

describe('loadExposure', () => {
  it('adds up each source per supplier, zeros for a supplier with nothing', async () => {
    tables.rows = {
      supplier_page_views: [{ supplier_id: 'A', views: 4 }, { supplier_id: 'A', views: 2 }],
      search_queries: [{ supplier_ids: ['A', 'B'] }, { supplier_ids: ['A', 'X'] }],
      supplier_offers: [{ supplier_id: 'A', product_id: 'p1' }, { supplier_id: 'B', product_id: 'p1' }],
      product_view_counts: [{ product_id: 'p1', views: 9 }],
      contact_clicks: [{ supplier_id: 'A', channel: 'whatsapp' }, { supplier_id: 'A', channel: 'phone' }],
      message_threads: [{ supplier_id: 'B' }],
      quote_requests: [{ supplier_id: 'A' }],
      orders: [{ supplier_id: 'A' }, { supplier_id: 'A' }],
    }
    const result = await loadExposure(['A', 'B', 'C'])
    expect(result.get('A')).toEqual({ pageViews: 6, searchAppearances: 2, productViews: 9, whatsapp: 1, calls: 1, questions: 0, quoteRequests: 1, orders: 2 })
    expect(result.get('B')).toMatchObject({ searchAppearances: 1, productViews: 9, questions: 1 })
    expect(result.get('C')).toEqual({ pageViews: 0, searchAppearances: 0, productViews: 0, whatsapp: 0, calls: 0, questions: 0, quoteRequests: 0, orders: 0 })
  })

  it('a missing table counts as zero, not an error', async () => {
    tables.rows = { search_queries: 'error', supplier_page_views: 'error' }
    const result = await loadExposure(['A'])
    expect(result.get('A')?.searchAppearances).toBe(0)
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
