import { redirect } from 'next/navigation'
import { regionsForCity } from '@/lib/regions'
import { getWorkViewer } from '@/lib/work-server'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'פרופיל יכולות — נגרים עובדים ביחד' }

/**
 * The capabilities profile, open before the board is: filling it is how a
 * carpentry joins, free during the launch. Not listed anywhere; it is for
 * matching (phase 3) and for the poster to see who is answering (phase 2).
 */
export default async function WorkProfilePage() {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) redirect('/app/work')

  return (
    <ProfileForm
      initial={{
        jobTypes: viewer.profile?.job_types ?? [],
        regions: viewer.profile?.regions ?? regionsForCity(viewer.carpenter.city),
        machines: viewer.profile?.machines ?? '',
        notifyEmail: viewer.profile?.notify_email ?? true,
      }}
      existing={Boolean(viewer.profile)}
      boardOpen={viewer.open}
    />
  )
}
