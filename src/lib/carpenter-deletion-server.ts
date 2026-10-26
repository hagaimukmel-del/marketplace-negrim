import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { logAdminAction } from './admin-scope'
import { purgeCutoff, restoredFields } from './carpenter-deletion'

/**
 * Deleting, restoring and finally removing carpentries (rules in
 * carpenter-deletion.ts, migration 20261026100000_carpenter_soft_delete).
 *
 * Every read tolerates the columns being absent, so the site keeps working on
 * a database the migration has not reached: nothing counts as deleted there.
 */

export interface DeletedCarpenter {
  id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  deleted_at: string
  deleted_by: string | null
  active_before_delete: boolean | null
}

/**
 * Ids of carpentries in the three-month window. Small by nature, so callers
 * filter their own rows against it rather than every query growing a join.
 */
export async function deletedCarpenterIds(): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdmin()
    .from('carpenters')
    .select('id')
    .not('deleted_at', 'is', null)
    .limit(5000)
  if (error) return new Set()
  return new Set((data ?? []).map((row) => row.id))
}

/** The admin's "deleted carpentries" list, most recent first. */
export async function listDeletedCarpenters(): Promise<{ ready: boolean; rows: DeletedCarpenter[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from('carpenters')
    .select('id, business_name, contact_name, phone, email, city, deleted_at, deleted_by, active_before_delete')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(2000)
  if (error) return { ready: false, rows: [] }
  return { ready: true, rows: (data ?? []) as DeletedCarpenter[] }
}

type Result = { ok: true } | { ok: false; status: number; error: string }

/** Mark a carpentry deleted and switch it off. Nothing else is touched. */
export async function softDeleteCarpenter(id: string, by = 'admin'): Promise<Result> {
  const supabase = getSupabaseAdmin()
  const { data: row, error: readError } = await supabase
    .from('carpenters')
    .select('id, business_name, is_active, deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (readError) return { ok: false, status: 500, error: readError.message }
  if (!row) return { ok: false, status: 404, error: 'הנגרייה לא נמצאה' }
  if (row.deleted_at) return { ok: true }

  const { data, error } = await supabase
    .from('carpenters')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: by,
      active_before_delete: row.is_active,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, status: 500, error: error.message }
  if (!data) return { ok: true } // deleted by a parallel click
  await logAdminAction({ action: 'delete_carpenter', targetId: id, details: { business_name: row.business_name } })
  return { ok: true }
}

/** Undo a delete: the row goes back to the state it had, blocked or active. */
export async function restoreCarpenter(id: string): Promise<Result> {
  const supabase = getSupabaseAdmin()
  const { data: row, error: readError } = await supabase
    .from('carpenters')
    .select('id, business_name, deleted_at, active_before_delete')
    .eq('id', id)
    .maybeSingle()
  if (readError) return { ok: false, status: 500, error: readError.message }
  if (!row) return { ok: false, status: 404, error: 'הנגרייה כבר נמחקה סופית' }
  if (!row.deleted_at) return { ok: true }

  const { error } = await supabase
    .from('carpenters')
    .update({ ...restoredFields(row.active_before_delete), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, status: 500, error: error.message }
  await logAdminAction({ action: 'restore_carpenter', targetId: id, details: { business_name: row.business_name } })
  return { ok: true }
}

/**
 * Remove for good what was deleted more than three months ago. Run daily from
 * the cron. Cascades exactly like the old hard delete: the carpentry's own
 * rows go with it, and past orders stay (they hold their own snapshot of the
 * business name, phone and prices) with the link back to this row cleared.
 */
export async function purgeExpiredCarpenters(now: Date = new Date()): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data: due, error } = await supabase
    .from('carpenters')
    .select('id, business_name, deleted_at')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', purgeCutoff(now).toISOString())
    .limit(500)
  if (error || !due?.length) return 0

  let purged = 0
  for (const row of due) {
    const { error: deleteError } = await supabase
      .from('carpenters')
      .delete()
      .eq('id', row.id)
      .not('deleted_at', 'is', null)
    if (deleteError) {
      console.error('Carpenter purge failed:', row.id, deleteError.message)
      continue
    }
    purged += 1
    await logAdminAction({
      action: 'purge_carpenter',
      targetId: row.id,
      details: { business_name: row.business_name, deleted_at: row.deleted_at },
    })
  }
  return purged
}
