import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getCarpenterId } from '@/lib/carpenter-auth'
import CheckoutClient, { type CheckoutPrefill } from './CheckoutClient'

export const dynamic = 'force-dynamic'

/**
 * Israeli mobiles are stored as their last nine digits, which is how one
 * business is recognised however it typed its number. Nobody wants to read
 * 521234567 back, so it goes out the way it came in.
 */
function displayPhone(stored: string | null): string {
  if (!stored) return ''
  const digits = stored.replace(/\D/g, '')
  if (digits.length !== 9) return stored
  return `0${digits.slice(0, 2)}-${digits.slice(2)}`
}

/**
 * Fill in what we already know.
 *
 * A carpenter gave us their name, business, phone and city when they
 * registered, and typed a delivery address the last time they ordered. Asking
 * for all of it again on every order is the kind of friction that turns a
 * two-tap reorder into a form.
 *
 * The address is deliberately not collected at registration: a carpentry's
 * registered address and the place a pallet should actually go are often
 * different, and on self-collection there is no address at all. So it is asked
 * once, at the first order, and remembered from there.
 *
 * Everything stays editable. This is a starting point, not a decision.
 */
export default async function CheckoutPage() {
  const carpenterId = await getCarpenterId()
  if (!carpenterId) return <CheckoutClient prefill={{}} />

  const supabase = getSupabaseAdmin()

  const [{ data: carpenter }, { data: lastOrder }] = await Promise.all([
    supabase
      .from('carpenters')
      .select('business_name, contact_name, phone, email, address, city')
      .eq('id', carpenterId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('address, city, zip_code, payment_method')
      .eq('carpenter_id', carpenterId)
      .not('address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const prefill: CheckoutPrefill = {
    name: carpenter?.contact_name ?? '',
    businessName: carpenter?.business_name ?? '',
    phone: displayPhone(carpenter?.phone ?? null),
    email: carpenter?.email ?? '',
    // The carpenter's own address is the default they set; the last order wins
    // only if they have not set one, because it is still where things went.
    address: carpenter?.address ?? lastOrder?.address ?? '',
    city: carpenter?.city ?? lastOrder?.city ?? '',
    zipCode: lastOrder?.zip_code ?? '',
    paymentTerms: lastOrder?.payment_method ?? '',
  }

  return <CheckoutClient prefill={prefill} />
}
