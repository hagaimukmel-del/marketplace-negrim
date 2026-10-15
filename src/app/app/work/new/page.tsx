import { redirect } from 'next/navigation'
import { regionsForCity } from '@/lib/regions'
import { isoDay } from '@/lib/work'
import { getWorkViewer } from '@/lib/work-server'
import JobForm from './JobForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'פרסום עבודה — נגרים עובדים ביחד' }

/** Post a job: members only, once the board is open. The region starts from the profile. */
export default async function NewJobPage() {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter || !viewer.open) redirect('/app/work')
  if (!viewer.member) redirect('/app/work/profile')

  const region = viewer.profile?.regions[0] ?? regionsForCity(viewer.carpenter.city)[0] ?? ''
  const now = new Date()
  return <JobForm region={region} today={isoDay(now)} last={isoDay(new Date(now.getTime() + 90 * 86_400_000))} />
}
