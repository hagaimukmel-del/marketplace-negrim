import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { loadJobBoard } from '@/lib/jobs-server'
import JobsBoard from '@/components/jobs/JobsBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'דרושים — ממשק הספק' }

function nowMs(): number {
  return Date.now()
}

/** The same דרושים board the carpentries see: suppliers read it and post on it. */
export default async function SupplierJobsPage() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  const cards = await loadJobBoard({ supplierId: supplier.id })
  return <JobsBoard cards={cards} newHref="/supplier/jobs/new" mineHref="/supplier/jobs/mine" now={nowMs()} />
}
