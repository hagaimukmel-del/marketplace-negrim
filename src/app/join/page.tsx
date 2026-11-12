import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { googleConfigured } from '@/lib/google-auth'
import JoinClient from './JoinClient'
import { safeNext } from '@/lib/notification-links'

export const dynamic = 'force-dynamic'

/**
 * Registration and login for carpenters. A carpenter this device already knows
 * is sent to the catalogue — there is nothing here for them.
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // `next`: the page that sent them here (a supplier's contact button), only inside /app.
  const next = safeNext((await searchParams).next, '/app')
  if (await getSessionCarpenter()) redirect(next ?? '/app')
  // The Google button shows only once its OAuth client is configured.
  // Where a carpentry we cannot email (no address on file) is told to write.
  const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_REPLY_TO || null
  return <JoinClient googleEnabled={googleConfigured()} contactEmail={contactEmail} next={next} />
}
