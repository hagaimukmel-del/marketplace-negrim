import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { ThresholdFields } from '@/lib/quote-rules'

/**
 * Special-price thresholds on supplier offers (migration 20261012090000) and
 * the special price itself (20261014110000).
 *
 * Read on their own and tolerantly, like price_mode: on a database without the
 * columns every offer simply has no threshold, so nothing else breaks.
 */
export async function loadThresholds(filter: { offerIds?: string[]; supplierId?: string }): Promise<Map<string, ThresholdFields>> {
  const out = new Map<string, ThresholdFields>()
  if (filter.offerIds && filter.offerIds.length === 0) return out
  const read = (columns: string) => {
    let query = getSupabaseAdmin().from('supplier_offers').select(columns).not('special_price_min_qty', 'is', null).limit(5000)
    if (filter.offerIds) query = query.in('id', filter.offerIds)
    if (filter.supplierId) query = query.eq('supplier_id', filter.supplierId)
    return query
  }
  let { data, error } = await read('id, special_price_min_qty, special_price_pack_qty, special_price_excl_vat')
  // Before migration 20261014110000 there is a threshold but no price.
  if (error?.code === '42703') ({ data, error } = await read('id, special_price_min_qty, special_price_pack_qty'))
  if (error) return out
  for (const row of (data ?? []) as unknown as ThresholdRow[]) {
    out.set(row.id, {
      minQty: row.special_price_min_qty == null ? null : Number(row.special_price_min_qty),
      setForPackQty: row.special_price_pack_qty == null ? null : Number(row.special_price_pack_qty),
      price: row.special_price_excl_vat == null ? null : Number(row.special_price_excl_vat),
    })
  }
  return out
}

interface ThresholdRow {
  id: string
  special_price_min_qty: number | null
  special_price_pack_qty: number | null
  special_price_excl_vat?: number | null
}

/**
 * The offer as a threshold check needs it, for the signed-in supplier only.
 * Null when the offer is not this supplier's.
 */
export async function loadOfferForThreshold(
  offerId: string,
  supplierId: string
): Promise<{ packQty: number | null; minOrderQty: number; threshold: ThresholdFields | null } | null> {
  const { data } = await getSupabaseAdmin()
    .from('supplier_offers')
    .select('pack_qty, min_order_qty')
    .eq('id', offerId)
    .eq('supplier_id', supplierId)
    .maybeSingle()
  if (!data) return null
  const thresholds = await loadThresholds({ offerIds: [offerId] })
  return {
    packQty: data.pack_qty == null ? null : Number(data.pack_qty),
    minOrderQty: Number(data.min_order_qty),
    threshold: thresholds.get(offerId) ?? null,
  }
}
