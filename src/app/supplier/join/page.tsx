import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import SupplierJoinClient from './SupplierJoinClient'

export const dynamic = 'force-dynamic'

/**
 * Sign-up and "send me a login link" — for someone who is not signed in.
 * A supplier this device already knows goes straight to their console instead
 * of being shown a registration form for a company that is already registered.
 */
export default async function SupplierJoinPage() {
  if (await getSessionSupplier()) redirect('/supplier')
  return <SupplierJoinClient />
}
