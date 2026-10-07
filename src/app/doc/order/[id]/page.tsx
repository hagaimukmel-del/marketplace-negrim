import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { quantityText, STATUS_LABEL } from '@/lib/app/orders'
import { orderNo } from '@/lib/app/format'
import { buyerOf } from '@/lib/app/doc-buyer'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import PurchaseDocument from '@/components/docs/PurchaseDocument'
import PrintBar from '@/components/docs/PrintBar'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'הזמנת רכש · שוק הנגרים', robots: { index: false } }

/**
 * One purchase order as a document to print or save as PDF. One order is one
 * supplier, so a checkout split across suppliers gives one document each.
 * Scoped to the signed-in carpentry: an id alone never reads an order.
 */
export default async function OrderDocument({ params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="קובץ ההזמנה" />
  const { id } = await params
  const [order] = await loadCarpenterOrders(carpenter.id, id)
  if (!order) notFound()

  return (
    <div className="min-h-dvh bg-stone-100 print:bg-white">
      <PrintBar back={`/app/orders/${order.id}`} backLabel="להזמנה" count={1} />
      <div className="p-3 sm:p-6 print:p-0">
        <PurchaseDocument
          kind="order"
          number={orderNo(order.shortNumber, order.orderNumber)}
          date={new Date(order.createdAt).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
          status={STATUS_LABEL[order.status]}
          supplier={{
            name: order.supplier?.name ?? 'ספק',
            phone: order.supplier?.phone,
            terms: order.supplier?.terms ?? [],
            leadDays: order.supplier?.leadDays ?? null,
          }}
          buyer={buyerOf(carpenter, order.address)}
          lines={order.lines.map((line) => ({
            name: line.name,
            quantity: quantityText(line),
            unitPrice: line.unitPrice,
            unit: line.unit,
            lineTotal: line.lineTotal,
          }))}
          confirmedTotal={order.confirmed}
          note={order.notes}
        />
      </div>
    </div>
  )
}
