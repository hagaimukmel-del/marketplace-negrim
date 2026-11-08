import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Who may change a product's photo from the supplier console.
 *
 * A product is shared by every supplier who sells it, so normally only the
 * supplier who created it may change what is shared. Products that came from
 * the sheet sync or the operator have no creator (`created_by_supplier_id` is
 * null), which used to lock their photo for everyone, including the one
 * supplier who actually sells them. A supplier who is the only seller of such
 * a product may set its photo: nobody else's listing changes.
 *
 * Only the photo. Name, category and description of a sheet product stay
 * locked, because the sheet sync matches on the name and owns those fields.
 */
export function mayEditPhoto(
  supplierId: string,
  createdBy: string | null,
  soldByOthers: boolean
): boolean {
  if (createdBy === supplierId) return true
  return createdBy === null && !soldByOthers
}

const CHUNK = 150

/** Of these products, the ones another supplier also has an offer on. */
export async function productsSoldByOthers(
  supabase: SupabaseClient<Database>,
  supplierId: string,
  productIds: string[]
): Promise<Set<string>> {
  const ids = [...new Set(productIds)]
  const shared = new Set<string>()
  for (let start = 0; start < ids.length; start += CHUNK) {
    const { data, error } = await supabase
      .from('supplier_offers')
      .select('product_id')
      .in('product_id', ids.slice(start, start + CHUNK))
      .neq('supplier_id', supplierId)
    // On a failed read, assume shared: locking is the safe side.
    if (error) return new Set(ids)
    for (const row of data ?? []) shared.add(row.product_id)
  }
  return shared
}
