import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import SupplierJoinClient from './SupplierJoinClient'
import { landingRef } from '@/lib/landing-ref'

export const dynamic = 'force-dynamic'

/**
 * Sign-up and "send me a login link" — for someone who is not signed in.
 * A supplier this device already knows goes straight to their console instead
 * of being shown a registration form for a company that is already registered.
 */
export default async function SupplierJoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (await getSessionSupplier()) redirect('/supplier')
  // Where the link came from (the supplier landing page passes it on), shown
  // to the operator with the application.
  return <SupplierJoinClient source={landingRef(await searchParams)} />
}
