import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { unitLabel } from '@/lib/catalog'
import { israelDate, stateOf, type QuoteRequest, type SupplierQuoteRequest } from '@/lib/quotes'
import type { QuoteKind } from '@/lib/quote-rules'
import { quoteThreadIds } from './messages'
import { deletedCarpenterIds } from './carpenter-deletion-server'

/**
 * Quote requests on the server (T-023). Every read tolerates the table being
 * absent (migration 20261011140000) and answers `ready: false`.
 */

const COLUMNS =
  'id, created_at, carpenter_id, supplier_id, product_id, quantity, note, status, quoted_unit_price_excl_vat, valid_until, supplier_note, order_id, ' +
  'products(name_he, base_unit), suppliers(company_name), carpenters(business_name, contact_name, phone, city)'

interface Row {
  id: string
  created_at: string
  carpenter_id: string
  supplier_id: string
  product_id: string
  quantity: number
  note: string | null
  status: string
  quoted_unit_price_excl_vat: number | null
  valid_until: string | null
  supplier_note: string | null
  order_id: string | null
  products: { name_he: string; base_unit: string } | null
  suppliers: { company_name: string } | null
  carpenters: { business_name: string; contact_name: string | null; phone: string | null; city: string | null } | null
}

type Packs = Map<string, { label: string | null; qty: number | null }>

async function load(filter: { carpenterId?: string; supplierId?: string }): Promise<{ ready: boolean; rows: Row[]; packs: Packs; kinds: Map<string, QuoteKind>; threads: Map<string, string> }> {
  const supabase = getSupabaseAdmin()
  let query = supabase.from('quote_requests').select(COLUMNS).order('created_at', { ascending: false }).limit(200)
  if (filter.carpenterId) query = query.eq('carpenter_id', filter.carpenterId)
  if (filter.supplierId) query = query.eq('supplier_id', filter.supplierId)
  const [{ data, error }, deleted] = await Promise.all([query, filter.supplierId ? deletedCarpenterIds() : Promise.resolve(new Set<string>())])
  if (error) return { ready: false, rows: [], packs: new Map(), kinds: new Map(), threads: new Map() }
  // A supplier does not see requests from a deleted carpentry while it waits to be restored or purged.
  const rows = ((data ?? []) as unknown as Row[]).filter((row) => !deleted.has(row.carpenter_id))

  // The pack each supplier sells it in, so a quantity reads as "4 × דלי 25 ק״ג".
  const packs = new Map<string, { label: string | null; qty: number | null }>()
  if (rows.length) {
    const { data: offers } = await supabase
      .from('supplier_offers')
      .select('product_id, supplier_id, pack_label, pack_qty')
      .in('product_id', [...new Set(rows.map((row) => row.product_id))])
    for (const offer of offers ?? []) {
      packs.set(`${offer.product_id}:${offer.supplier_id}`, { label: offer.pack_label, qty: offer.pack_qty == null ? null : Number(offer.pack_qty) })
    }
  }
  // What each request was (migration 20261012090000), read on its own so the
  // list works without it. Requests from before it have no kind and show none.
  const kinds = new Map<string, QuoteKind>()
  if (rows.length) {
    const { data: kindRows, error: kindError } = await supabase
      .from('quote_requests')
      .select('id, kind')
      .in('id', rows.map((row) => row.id))
    if (!kindError) {
      for (const row of kindRows ?? []) if (row.kind === 'quote' || row.kind === 'volume') kinds.set(row.id, row.kind)
    }
  }
  // The conversation of each request (migration 20261025140000); none before it.
  const threads = await quoteThreadIds(rows.map((row) => row.id))
  return { ready: true, rows, packs, kinds, threads }
}

function toQuote(row: Row, packs: Packs, kinds: Map<string, QuoteKind>, threads: Map<string, string>, today: string): QuoteRequest {
  const pack = packs.get(`${row.product_id}:${row.supplier_id}`)
  return {
    id: row.id,
    createdAt: row.created_at,
    productId: row.product_id,
    productName: row.products?.name_he ?? 'מוצר',
    unit: unitLabel(row.products?.base_unit ?? 'unit'),
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.company_name ?? 'ספק',
    quantity: Number(row.quantity),
    note: row.note,
    state: stateOf(row.status, row.valid_until, today),
    unitPrice: row.quoted_unit_price_excl_vat == null ? null : Number(row.quoted_unit_price_excl_vat),
    validUntil: row.valid_until,
    supplierNote: row.supplier_note,
    orderId: row.order_id,
    packLabel: pack?.label ?? null,
    packQty: pack?.qty ?? null,
    kind: kinds.get(row.id) ?? null,
    threadId: threads.get(row.id) ?? null,
  }
}

export async function loadCarpenterQuotes(carpenterId: string): Promise<{ ready: boolean; quotes: QuoteRequest[] }> {
  const { ready, rows, packs, kinds, threads } = await load({ carpenterId })
  const today = israelDate()
  return { ready, quotes: rows.map((row) => toQuote(row, packs, kinds, threads, today)) }
}

export async function loadSupplierQuotes(supplierId: string): Promise<{ ready: boolean; quotes: SupplierQuoteRequest[] }> {
  const { ready, rows, packs, kinds, threads } = await load({ supplierId })
  const today = israelDate()
  return {
    ready,
    quotes: rows.map((row) => ({
      ...toQuote(row, packs, kinds, threads, today),
      carpenter: row.carpenters?.business_name ?? 'נגרייה',
      contactName: row.carpenters?.contact_name ?? null,
      phone: row.carpenters?.phone ?? null,
      city: row.carpenters?.city ?? null,
    })),
  }
}

/** Answered quotes still waiting for this carpentry: the count beside "הצעות מחיר". */
export async function answeredQuoteCount(carpenterId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from('quote_requests')
    .select('id')
    .eq('carpenter_id', carpenterId)
    .eq('status', 'quoted')
    .gte('valid_until', israelDate())
    .limit(100)
  return error ? 0 : (data ?? []).length
}

/**
 * For the operator: how many requests each supplier got and how many are
 * still unanswered. Never the quoted price (plan doc, "מה נחשף לאדמין").
 */
export async function quoteCountsBySupplier(): Promise<{ ready: boolean; bySupplier: Map<string, { total: number; open: number }> }> {
  const { data, error } = await getSupabaseAdmin().from('quote_requests').select('supplier_id, status').limit(10000)
  if (error) return { ready: false, bySupplier: new Map() }
  const bySupplier = new Map<string, { total: number; open: number }>()
  for (const row of data ?? []) {
    const counts = bySupplier.get(row.supplier_id) ?? { total: 0, open: 0 }
    counts.total += 1
    if (row.status === 'requested') counts.open += 1
    bySupplier.set(row.supplier_id, counts)
  }
  return { ready: true, bySupplier }
}
