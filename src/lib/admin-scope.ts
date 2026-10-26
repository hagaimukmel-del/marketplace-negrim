import 'server-only'

import { NextResponse } from 'next/server'
import { isAdmin } from './admin-auth'
import { getSupabaseAdmin } from './supabase-admin'
import { getSupplierSessionVia } from './supplier-auth'
import type { Json } from './database.types'

/**
 * What the operator may change on a supplier's behalf.
 *
 * The operator also owns the first supplier, so a second supplier will ask
 * what the platform can do on their account. The answer (owner, 2026-10-08):
 * a supplier who signed up through /supplier/join runs their own account.
 * The admin can look, hide an offer that breaks the catalogue and merge a
 * duplicate, but never sets their prices, confirms their orders or opens their
 * order lines without it being written down.
 *
 * Suppliers the operator created (`source` 'seed' or 'admin') are run by the
 * operator, so everything stays editable for them.
 */
export function isOperatorManaged(source: string | null | undefined): boolean {
  return source !== 'self'
}

export async function supplierIsOperatorManaged(supplierId: string | null): Promise<boolean> {
  if (!supplierId) return true
  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select('source')
    .eq('id', supplierId)
    .maybeSingle()
  return isOperatorManaged(data?.source)
}

export const SUPPLIER_RUNS_OWN_ACCOUNT =
  'הספק מנהל את החשבון שלו בעצמו. מהאדמין אפשר רק לצפות.'

/** 403 for an admin action on a self-run supplier's data. */
export function refusedForSelfRun() {
  return NextResponse.json({ error: SUPPLIER_RUNS_OWN_ACCOUNT }, { status: 403 })
}

/**
 * Is the supplier console open as the operator's look, not its owner's session?
 *
 * Decided by how the supplier session was minted (signed into the cookie), not
 * by whether the admin cookie is also in the browser. The operator runs a
 * supplier of his own too: signed in through that supplier's link or sign-in
 * email he is its owner and must be able to edit it. Only a session opened from
 * /admin/view/supplier is the operator looking — and stays so after the admin
 * cookie lapses. A session from before the door was recorded counts as the
 * operator's only while the admin cookie is present, as it did before.
 */
export async function isAdminLookingAtSupplier(): Promise<boolean> {
  const via = await getSupplierSessionVia()
  if (via === 'admin') return true
  if (via === 'unknown') return isAdmin()
  return false
}

/**
 * The supplier console's write routes call this first. A session the operator
 * opened through "האתר כפי שספק רואה" is read-only for a self-run supplier.
 */
export async function refuseAdminWriteFor(supplier: { source: string }) {
  if (isOperatorManaged(supplier.source)) return null
  return (await isAdminLookingAtSupplier()) ? refusedForSelfRun() : null
}

/**
 * Write down what the operator did inside a supplier's data.
 *
 * Best-effort on purpose: the log is the proof of the rules, not a gate, and
 * the console must keep working on a database where `admin_actions` is not
 * there yet (migration 20261008120000_admin_actions).
 */
export async function logAdminAction(entry: {
  action: string
  supplierId?: string | null
  targetId?: string | null
  details?: Json
}) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('admin_actions')
      .insert({
        action: entry.action,
        supplier_id: entry.supplierId ?? null,
        target_id: entry.targetId ?? null,
        details: entry.details ?? {},
      })
    if (error) console.error('Admin action not logged:', error.message)
  } catch (err) {
    console.error('Admin action not logged:', err)
  }
}
