import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { loadMyJobs } from '@/lib/jobs-server'
import MyJobs from '@/components/jobs/MyJobs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'המודעות שלי — דרושים' }

function nowMs(): number {
  return Date.now()
}

export default async function SupplierMyJobsPage() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  const jobs = await loadMyJobs({ column: 'supplier_id', id: supplier.id })
  return <MyJobs jobs={jobs} side="supplier" boardHref="/supplier/jobs" newHref="/supplier/jobs/new" now={nowMs()} />
}
