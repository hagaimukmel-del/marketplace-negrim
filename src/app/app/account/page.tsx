import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getCarpenterId } from '@/lib/carpenter-auth'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import AccountView from './AccountView'

export const dynamic = 'force-dynamic'

/** "הנגרייה שלי": the carpentry's details, its link, and the way out. */
export default async function AppAccount() {
  const carpenterId = await getCarpenterId()
  if (!carpenterId) return <SignedOutNotice what="האזור האישי" />

  const { data: carpenter } = await getSupabaseAdmin()
    .from('carpenters')
    .select('business_name, contact_name, phone, email, address, city, token')
    .eq('id', carpenterId)
    .eq('is_active', true)
    .maybeSingle()
  if (!carpenter) return <SignedOutNotice what="האזור האישי" />

  // Built from the host actually in use, so it is right on production and on a preview.
  const host = (await headers()).get('host') ?? ''
  const protocol = host.startsWith('localhost') ? 'http' : 'https'

  return <AccountView carpenter={carpenter} origin={`${protocol}://${host}`} />
}
