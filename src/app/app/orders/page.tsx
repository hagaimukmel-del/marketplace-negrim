import Link from 'next/link'
import { FileText } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { loadCarpenterQuotes } from '@/lib/quotes-server'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import OrdersView from './OrdersView'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}

/** The orders center: sections, not filters. Quote requests sit one tap away. */
export default async function AppOrders() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="מרכז ההזמנות" />
  const [orders, { quotes }] = await Promise.all([loadCarpenterOrders(carpenter.id), loadCarpenterQuotes(carpenter.id)])
  const answered = quotes.filter((quote) => quote.state === 'quoted').length
  const waiting = quotes.filter((quote) => quote.state === 'requested').length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {answered + waiting > 0 && (
        <Link href="/app/quotes" className="mt-1 flex items-center gap-2.5 rounded-2xl border border-hair bg-white px-3.5 py-3 text-[15px] md:hidden">
          <FileText size={18} className="shrink-0 text-navy" />
          <span className="min-w-0 flex-1">
            <b>הצעות מחיר</b>
            <span className="text-muted">
              {answered > 0 ? ` · ${answered === 1 ? 'הצעה אחת התקבלה' : `${answered} הצעות התקבלו`}` : ''}
              {waiting > 0 ? ` · ${waiting === 1 ? 'אחת מחכה לספק' : `${waiting} מחכות לספק`}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-brand-ink">לצפייה</span>
        </Link>
      )}
      <OrdersView orders={orders} now={nowMs()} />
    </div>
  )
}
