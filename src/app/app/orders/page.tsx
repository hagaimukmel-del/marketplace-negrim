import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import OrdersView from './OrdersView'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}

/** The orders center: sections, not filters. */
export default async function AppOrders() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="מרכז ההזמנות" />
  const orders = await loadCarpenterOrders(carpenter.id)
  return <OrdersView orders={orders} now={nowMs()} />
}
