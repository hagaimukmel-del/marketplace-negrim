import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { workBoardOpen } from '@/lib/work-server'
import WorkAdmin, { type AdminJob, type AdminWorkReport } from './WorkAdmin'

export const dynamic = 'force-dynamic'

/**
 * The work board for the operator: the launch condition (30 profiles, 10
 * open jobs), open reports, and every job with its state.
 */
export default async function WorkAdminPage() {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const [{ data: jobs }, { data: reports }, { count: profiles }, { count: members }] = await Promise.all([
    supabase
      .from('work_jobs')
      .select('id, job_type, region, quantity, material, due_date, description, image_url, status, close_outcome, removed_reason, expires_at, created_at, carpenters!work_jobs_carpenter_id_fkey(business_name, is_active)')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('work_job_reports')
      .select('id, job_id, reason, note, created_at, reporter:carpenters(business_name)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('work_profiles').select('carpenter_id', { count: 'exact', head: true }),
    supabase.from('work_subscriptions').select('carpenter_id', { count: 'exact', head: true }).in('status', ['founding', 'active']),
  ])

  const rows: AdminJob[] = (jobs ?? []).map((row) => {
    const owner = row.carpenters as { business_name: string; is_active: boolean } | null
    return {
      id: row.id,
      jobType: row.job_type,
      region: row.region,
      quantity: row.quantity,
      material: row.material,
      dueDate: row.due_date,
      description: row.description,
      image: row.image_url,
      status: row.status,
      closeOutcome: row.close_outcome,
      removedReason: row.removed_reason,
      live: row.status === 'open' && row.expires_at > now,
      createdAt: row.created_at,
      owner: owner?.business_name ?? 'נגרייה שנמחקה',
      ownerActive: owner?.is_active ?? false,
    }
  })

  const open: AdminWorkReport[] = (reports ?? []).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
    reporter: (row.reporter as { business_name: string } | null)?.business_name ?? '—',
  }))

  return <WorkAdmin jobs={rows} reports={open} profiles={profiles ?? 0} members={members ?? 0} boardOpen={workBoardOpen()} />
}
