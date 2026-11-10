import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen } from '@/lib/jobs-server'
import { formatPhone } from '@/lib/phone'
import { isoDay, jobRegionForCity } from '@/lib/jobs'
import JobForm from '@/components/jobs/JobForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'מודעת דרושים חדשה — ממשק הספק' }

/** A supplier's ad, with the business, city and phone filled in from its details. */
export default async function SupplierNewJobPage() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  if (!jobsBoardOpen() && !(await isAdmin())) redirect('/supplier/jobs')

  return (
    <JobForm
      side="supplier"
      today={isoDay(new Date())}
      doneHref="/supplier/jobs/mine"
      initial={{
        businessName: supplier.company_name ?? '',
        region: jobRegionForCity(supplier.city),
        location: supplier.city ?? '',
        phone: supplier.phone ? formatPhone(supplier.phone) : '',
      }}
    />
  )
}
