import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import JoinClient from './JoinClient'

export const dynamic = 'force-dynamic'

/**
 * Registration and login for carpenters. A carpenter this device already knows
 * is sent to the catalogue — there is nothing here for them.
 */
export default async function JoinPage() {
  if (await getSessionCarpenter()) redirect('/carpenter/catalog')
  return <JoinClient />
}
