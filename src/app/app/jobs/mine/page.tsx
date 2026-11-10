import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen, loadMyJobs } from '@/lib/jobs-server'
import MyJobs from '@/components/jobs/MyJobs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'המודעות שלי — דרושים' }

function nowMs(): number {
  return Date.now()
}

export default async function MyJobsPage() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter || (!jobsBoardOpen() && !(await isAdmin()))) redirect('/app/jobs')
  const jobs = await loadMyJobs({ column: 'carpenter_id', id: carpenter.id })
  return <MyJobs jobs={jobs} side="carpenter" boardHref="/app/jobs" newHref="/app/jobs/new" now={nowMs()} />
}
