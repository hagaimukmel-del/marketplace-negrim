import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import Landing from './Landing'

export const dynamic = 'force-dynamic'

/**
 * A signed-in carpentry opens on its home screen; anyone else gets the landing
 * page, which says what the site is before asking them to register.
 */
export default async function Home() {
  if (await getSessionCarpenter()) redirect('/app')
  return <Landing />
}
