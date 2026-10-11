import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Extra addresses that get a copy of a supplier's new orders (plan stage 6).
 *
 * Read on its own, like delivery terms: the column comes from migration
 * 20261011120000, and on a database without it this returns `ready: false`
 * and no copies instead of failing the order email.
 */

export const MAX_ORDER_CC = 5

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Cleans a list from the form: trimmed, lower-cased, unique, valid. Returns a message on a bad address. */
export function cleanOrderCc(input: unknown, mainEmail: string | null): string[] | string {
  if (!Array.isArray(input)) return 'רשימת נמענים לא תקינה'
  const emails: string[] = []
  for (const value of input) {
    if (typeof value !== 'string') return 'רשימת נמענים לא תקינה'
    const email = value.trim().toLowerCase().slice(0, 160)
    if (!email) continue
    if (!EMAIL.test(email)) return `כתובת מייל לא תקינה: ${email}`
    if (email === mainEmail?.toLowerCase() || emails.includes(email)) continue
    emails.push(email)
  }
  if (emails.length > MAX_ORDER_CC) return `אפשר עד ${MAX_ORDER_CC} נמענים נוספים`
  return emails
}

export async function loadOrderCc(supplierIds: string[]): Promise<{ ready: boolean; bySupplier: Map<string, string[]> }> {
  const bySupplier = new Map<string, string[]>()
  if (supplierIds.length === 0) return { ready: true, bySupplier }
  const { data, error } = await getSupabaseAdmin().from('suppliers').select('id, order_cc_emails').in('id', supplierIds)
  if (error) return { ready: false, bySupplier }
  for (const row of data ?? []) bySupplier.set(row.id, row.order_cc_emails ?? [])
  return { ready: true, bySupplier }
}
