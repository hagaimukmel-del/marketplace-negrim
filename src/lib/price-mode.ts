import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Which suppliers chose "רק הצעת מחיר" (T-023, migration 20261011140000).
 *
 * Their offers stay in supplier_offers with a price; every reader that shows a
 * price to anyone but the supplier itself asks this first and leaves the price
 * out. Read on its own so a database without the column has no quote-only
 * supplier and nothing changes.
 */
export interface PriceModes {
  ready: boolean
  quoteOnly: Set<string>
}

export async function loadPriceModes(): Promise<PriceModes> {
  const { data, error } = await getSupabaseAdmin().from('suppliers').select('id').eq('price_mode', 'quote').limit(1000)
  if (error) return { ready: false, quoteOnly: new Set() }
  return { ready: true, quoteOnly: new Set((data ?? []).map((row) => row.id)) }
}

/** One supplier's mode, or null on a database without the column. */
export async function priceModeOf(supplierId: string): Promise<'shown' | 'quote' | null> {
  const { data, error } = await getSupabaseAdmin().from('suppliers').select('price_mode').eq('id', supplierId).maybeSingle()
  if (error || !data) return null
  return data.price_mode === 'quote' ? 'quote' : 'shown'
}
