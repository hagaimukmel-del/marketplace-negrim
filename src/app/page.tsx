import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'

/**
 * A signed-in carpentry opens on its home screen; anyone else on the catalogue,
 * which is where a visitor can see what the site is before registering.
 */
export default async function Home() {
  redirect((await getSessionCarpenter()) ? '/app' : '/app/catalog')
}
