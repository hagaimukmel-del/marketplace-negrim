import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen } from '@/lib/jobs-server'
import { formatPhone } from '@/lib/phone'
import { isoDay, jobRegionForCity } from '@/lib/jobs'
import JobForm from '@/components/jobs/JobForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'מודעת דרושים חדשה — שוק הנגרים' }

/** A new ad, with the business, city and phone filled in from registration. */
export default async function NewJobPage() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter || (!jobsBoardOpen() && !(await isAdmin()))) redirect('/app/jobs')

  return (
    <JobForm
      side="carpenter"
      today={isoDay(new Date())}
      doneHref="/app/jobs/mine"
      initial={{
        businessName: carpenter.business_name ?? '',
        region: jobRegionForCity(carpenter.city),
        location: carpenter.city ?? '',
        phone: carpenter.phone ? formatPhone(carpenter.phone) : '',
      }}
    />
  )
}
