import { notFound } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import OrderDetail from './OrderDetail'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}

/** One order: its state as the anchor, a card only when it wants the carpenter. */
export default async function AppOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="פרטי ההזמנה" />
  const { id } = await params
  const orders = await loadCarpenterOrders(carpenter.id)
  const order = orders.find((o) => o.id === id)
  if (!order) notFound()
  const siblings = order.checkoutId ? orders.filter((o) => o.checkoutId === order.checkoutId && o.id !== order.id) : []
  return <OrderDetail order={order} siblings={siblings} now={nowMs()} />
}
