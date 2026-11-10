import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import type { DaysMode, JobCard, MyJob } from './jobs'

/**
 * Reads for דרושים. Every read goes through the service role and decides here
 * what a viewer may see: live ads only (open, not expired, from a carpenter who
 * is not blocked or a supplier who is still approved), and never the phone.
 */

/**
 * Whether דרושים is open (owner, 2026-11-10: "בהמשך" until the staffing partner is signed).
 * Until JOBS_BOARD_OPEN=true is set on Vercel, carpentries and suppliers see a
 * coming-soon page and the API refuses them; the operator still sees and uses
 * the real board to check it.
 */
export function jobsBoardOpen(): boolean {
  return process.env.JOBS_BOARD_OPEN === 'true'
}

const COLUMNS =
  'id, carpenter_id, supplier_id, business_name, region, location, role, salary, days_mode, weekdays, work_dates, days_text, hours, scope, description, created_at, expires_at, status, carpenters(is_active), suppliers(status)'

type Row = {
  id: string
  carpenter_id: string | null
  supplier_id: string | null
  business_name: string
  region: string
  location: string
  role: string
  salary: string | null
  days_mode: string
  weekdays: number[]
  work_dates: string[]
  days_text: string | null
  hours: string | null
  scope: string | null
  description: string | null
  created_at: string
  expires_at: string
  status: string
  carpenters: { is_active: boolean | null } | null
  suppliers: { status: string } | null
}

/** Who is looking: their own ads are marked, and theirs only. */
export interface JobViewer {
  carpenterId?: string | null
  supplierId?: string | null
}

/** The owner is still allowed on the site. One rule for the board and the phone. */
export function ownerLive(row: { carpenters: { is_active: boolean | null } | null; suppliers: { status: string } | null }): boolean {
  if (row.suppliers) return row.suppliers.status === 'approved'
  return Boolean(row.carpenters?.is_active)
}

function toCard(row: Row, viewer: JobViewer): JobCard {
  return {
    id: row.id,
    side: row.supplier_id ? 'supplier' : 'carpenter',
    businessName: row.business_name,
    region: row.region,
    location: row.location,
    role: row.role,
    salary: row.salary,
    daysMode: row.days_mode as DaysMode,
    weekdays: row.weekdays ?? [],
    dates: row.work_dates ?? [],
    daysText: row.days_text,
    hours: row.hours,
    scope: row.scope,
    description: row.description,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    mine: Boolean(
      (viewer.carpenterId && row.carpenter_id === viewer.carpenterId) || (viewer.supplierId && row.supplier_id === viewer.supplierId)
    ),
  }
}

/** The board: every live ad, newest first. */
export async function loadJobBoard(viewer: JobViewer): Promise<JobCard[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('job_posts')
    .select(COLUMNS)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    // A database without the migration yet: an empty board, not a broken page.
    console.error('Jobs board read failed:', error.message)
    return []
  }
  return ((data ?? []) as unknown as Row[]).filter(ownerLive).map((row) => toCard(row, viewer))
}

/** One owner's ads, every status, newest first. */
export async function loadMyJobs(owner: { column: 'carpenter_id' | 'supplier_id'; id: string }): Promise<MyJob[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('job_posts')
    .select(COLUMNS)
    .eq(owner.column, owner.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('My jobs read failed:', error.message)
    return []
  }
  const viewer = owner.column === 'carpenter_id' ? { carpenterId: owner.id } : { supplierId: owner.id }
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...toCard(row, viewer),
    status: row.status as MyJob['status'],
  }))
}
