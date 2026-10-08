import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isRegionKey, regionsForCity, type RegionKey } from '@/lib/regions'

/**
 * Where each supplier delivers (T-026), and whether that reaches a carpenter.
 *
 * Read on its own, not joined into the catalogue query: the columns come from
 * migration 20261008130000, and a select naming a column the database does not
 * have fails as a whole. Kept separate, a database without the migration just
 * means "no supplier has set regions yet" instead of an empty catalogue.
 */

export interface SupplierDelivery {
  regions: RegionKey[]
  feeExclVat: number | null
  freeFromExclVat: number | null
}

/** Delivery terms per supplier; `ready` is false on a database without migration 20261008130000. */
export async function loadDelivery(supplierIds?: string[]): Promise<{ ready: boolean; bySupplier: Map<string, SupplierDelivery> }> {
  let query = getSupabaseAdmin().from('suppliers').select('id, delivery_regions, delivery_fee_excl_vat, free_delivery_from_excl_vat')
  if (supplierIds) query = query.in('id', supplierIds.length ? supplierIds : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await query
  const bySupplier = new Map<string, SupplierDelivery>()
  if (error) return { ready: false, bySupplier }
  for (const row of data ?? []) {
    bySupplier.set(row.id, {
      regions: (row.delivery_regions ?? []).filter(isRegionKey),
      feeExclVat: row.delivery_fee_excl_vat == null ? null : Number(row.delivery_fee_excl_vat),
      freeFromExclVat: row.free_delivery_from_excl_vat == null ? null : Number(row.free_delivery_from_excl_vat),
    })
  }
  return { ready: true, bySupplier }
}

/**
 * True or false only when both sides are known: the supplier has set regions
 * and the carpenter's city maps to a region. Otherwise null, which the app
 * shows as nothing at all rather than guessing.
 */
export function deliversTo(delivery: SupplierDelivery | undefined, carpenterRegions: RegionKey[]): boolean | null {
  if (!delivery || delivery.regions.length === 0 || carpenterRegions.length === 0) return null
  return carpenterRegions.some((region) => delivery.regions.includes(region))
}

export { regionsForCity }
