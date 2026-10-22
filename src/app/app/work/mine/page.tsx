import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getWorkViewer } from '@/lib/work-server'
import { answersPerJob } from '@/lib/work-chat-server'
import MyJobs, { type MyJob } from './MyJobs'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}
export const metadata = { title: 'העבודות שלי — נגרים עובדים ביחד' }

export default async function MyJobsPage() {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter || (!viewer.open && !viewer.admin)) redirect('/app/work')

  const [{ data }, answers] = await Promise.all([
    getSupabaseAdmin()
      .from('work_jobs')
      .select('id, job_type, quantity, material, region, due_date, status, close_outcome, removed_reason, expires_at, created_at')
      .eq('carpenter_id', viewer.carpenter.id)
      .order('created_at', { ascending: false })
      .limit(200),
    answersPerJob(viewer.carpenter.id),
  ])

  const jobs: MyJob[] = (data ?? []).map((row) => ({
    id: row.id,
    jobType: row.job_type,
    quantity: row.quantity,
    material: row.material,
    region: row.region,
    dueDate: row.due_date,
    status: row.status,
    closeOutcome: row.close_outcome,
    removedByAdmin: Boolean(row.removed_reason?.startsWith('admin')),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    answers: answers[row.id] ?? 0,
  }))

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-extrabold text-ink">העבודות שלי</h1>
        {viewer.member && (
          <Link href="/app/work/new" className="ms-auto flex h-10 items-center rounded-[11px] bg-[#0E5E5E] px-3 text-sm font-bold text-white">
            פרסום עבודה
          </Link>
        )}
      </header>
      <MyJobs jobs={jobs} now={nowMs()} />
    </div>
  )
}
