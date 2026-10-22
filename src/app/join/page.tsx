import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { googleConfigured } from '@/lib/google-auth'
import JoinClient from './JoinClient'

export const dynamic = 'force-dynamic'

/**
 * Registration and login for carpenters. A carpenter this device already knows
 * is sent to the catalogue — there is nothing here for them.
 */
export default async function JoinPage() {
  if (await getSessionCarpenter()) redirect('/app')
  // The Google button shows only once its OAuth client is configured.
  // Where a carpentry we cannot email (no address on file) is told to write.
  const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_REPLY_TO || null
  return <JoinClient googleEnabled={googleConfigured()} contactEmail={contactEmail} />
}
