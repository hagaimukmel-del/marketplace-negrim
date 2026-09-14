import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getCarpenterId } from '@/lib/carpenter-auth'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

/**
 * The personal area, behind the session and nothing else.
 *
 * A visitor with no session is sent to sign up rather than shown an empty
 * shell — there is nothing here that means anything without a carpenter.
 */
export default async function AccountPage() {
  const carpenterId = await getCarpenterId()
  if (!carpenterId) redirect('/join')

  const { data: carpenter } = await getSupabaseAdmin()
    .from('carpenters')
    .select('business_name, contact_name, phone, email, city, token')
    .eq('id', carpenterId)
    .eq('is_active', true)
    .maybeSingle()

  // Signed in as somebody the database no longer has, or no longer active.
  if (!carpenter) redirect('/join')

  // The link is built from the host actually being used, so it is copyable and
  // correct whether this is the production domain or a preview build.
  const host = (await headers()).get('host') ?? ''
  const protocol = host.startsWith('localhost') ? 'http' : 'https'

  return <AccountClient carpenter={carpenter} origin={`${protocol}://${host}`} />
}
