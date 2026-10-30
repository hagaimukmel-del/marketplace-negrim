import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter, type SessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isRegionKey } from '@/lib/regions'
import { isJobType, subscriptionGrants, toBoardJob, type BoardJob, type Poster } from '@/lib/work'

/**
 * Whether the board is open to carpenters. Until it is, /app/work shows the
 * coming-soon page and only the capabilities profile can be filled, so the
 * launch can wait for 30 profiles and 10 jobs (the spec's condition) while
 * the operator previews the real board. Set WORK_BOARD_OPEN=true on Vercel to
 * open it; staging may set it earlier.
 */
export function workBoardOpen(): boolean {
  return process.env.WORK_BOARD_OPEN === 'true'
}

export interface WorkProfile {
  job_types: string[]
  regions: string[]
  machines: string | null
  notify_email: boolean
}

export interface WorkViewer {
  carpenter: SessionCarpenter | null
  admin: boolean
  profile: WorkProfile | null
  /** May post, answer and see who posted: the subscription check, in one place. */
  member: boolean
  open: boolean
}

/** Who is looking at the work board, and what they may do. Re-read on every request. */
export async function getWorkViewer(now: Date = new Date()): Promise<WorkViewer> {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  if (!carpenter) return { carpenter: null, admin, profile: null, member: false, open: workBoardOpen() }

  const supabase = getSupabaseAdmin()
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from('work_profiles')
      .select('job_types, regions, machines, notify_email')
      .eq('carpenter_id', carpenter.id)
      .maybeSingle(),
    supabase
      .from('work_subscriptions')
      .select('status, ends_at')
      .eq('carpenter_id', carpenter.id)
      .maybeSingle(),
  ])

  return {
    carpenter,
    admin,
    profile: profile ?? null,
    member: subscriptionGrants(subscription ?? null, now),
    open: workBoardOpen(),
  }
}

/**
 * How many carpentries are connected to the work network: a capabilities
 * profile, not blocked, and not a test business ("ניסיון", like lib/email).
 * Only the number leaves the database (a head count), never who they are.
 * A database without the table yet, or any error, reads as null: show nothing.
 */
export async function connectedCarpentries(): Promise<number | null> {
  const { count, error } = await getSupabaseAdmin()
    .from('work_profiles')
    .select('carpenter_id, carpenters!inner(is_active, business_name)', { count: 'exact', head: true })
    .eq('carpenters.is_active', true)
    .not('carpenters.business_name', 'like', '%ניסיון%')
  if (error || count === null) return null
  return count
}

const JOB_COLUMNS =
  'id, carpenter_id, job_type, region, quantity, material, due_date, description, image_url, status, expires_at, created_at, carpenters!work_jobs_carpenter_id_fkey!inner(business_name, city, is_active)'

interface PosterJoin {
  business_name: string
  city: string | null
  is_active: boolean
}

function posterOf(join: unknown): Poster | null {
  const row = join as PosterJoin | null
  return row ? { businessName: row.business_name, city: row.city } : null
}

function viewerKey(viewer: WorkViewer) {
  return { carpenterId: viewer.carpenter?.id ?? null, member: viewer.member, admin: viewer.admin }
}

export interface BoardFilters {
  region?: string
  type?: string
}

/**
 * The board: open jobs that have not expired, from carpentries that are not
 * blocked, newest first. Expiry is a filter at read time, like המציאון, so
 * there is no job to run. A database without the tables yet reads as empty.
 */
export async function loadBoard(viewer: WorkViewer, filters: BoardFilters, now: Date = new Date()): Promise<BoardJob[]> {
  let query = getSupabaseAdmin()
    .from('work_jobs')
    .select(JOB_COLUMNS)
    .eq('status', 'open')
    .gt('expires_at', now.toISOString())
    .eq('carpenters.is_active', true)
  if (filters.region && isRegionKey(filters.region)) query = query.eq('region', filters.region)
  if (filters.type && isJobType(filters.type)) query = query.eq('job_type', filters.type)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(300)
  if (error) {
    console.error('Work board read failed:', error.message)
    return []
  }
  return (data ?? []).map((row) => toBoardJob(row, posterOf(row.carpenters), viewerKey(viewer)))
}

export interface JobDetail extends BoardJob {
  status: string
  live: boolean
}

/**
 * One job. Anyone who may see the board sees a live job; the poster also sees
 * their own closed or removed one, and the operator sees everything.
 */
export async function loadJob(viewer: WorkViewer, id: string, now: Date = new Date()): Promise<JobDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await getSupabaseAdmin().from('work_jobs').select(JOB_COLUMNS).eq('id', id).maybeSingle()
  if (error || !data) return null

  const owner = data.carpenters as unknown as PosterJoin | null
  const live = data.status === 'open' && new Date(data.expires_at) > now && Boolean(owner?.is_active)
  const job = toBoardJob(data, posterOf(data.carpenters), viewerKey(viewer))
  if (!live && !job.mine && !viewer.admin) return null
  return { ...job, status: data.status, live }
}
