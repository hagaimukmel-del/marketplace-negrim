/**
 * Convenience aliases over the generated schema types.
 *
 * `database.types.ts` is overwritten wholesale by `npm run db:types`, so
 * anything hand-written has to live here instead.
 */

import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export type ProductRow = Tables['products']['Row']
export type CategoryRow = Tables['categories']['Row']
export type SupplierRow = Tables['suppliers']['Row']
export type OrderRow = Tables['orders']['Row']
export type OrderInsert = Tables['orders']['Insert']
export type OrderUpdate = Tables['orders']['Update']
export type OrderItemRow = Tables['order_items']['Row']
export type OrderItemInsert = Tables['order_items']['Insert']
export type UserProfileRow = Tables['user_profiles']['Row']

/** `user_profiles.role` and `profiles.role` are CHECK-constrained to these. */
export type UserRole = 'carpenter' | 'supplier' | 'admin'

/** An order plus its lines, as the order detail endpoint returns it. */
export type OrderWithItems = OrderRow & { order_items: OrderItemRow[] }

/**
 * `role` comes back from the generator as a bare string, because the column is
 * text with a CHECK constraint rather than a Postgres enum. Narrow it at the
 * boundary instead of casting.
 */
export function asUserRole(value: string | null | undefined): UserRole | null {
  return value === 'carpenter' || value === 'supplier' || value === 'admin'
    ? value
    : null
}
