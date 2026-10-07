'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import { quantityText } from '@/lib/app/orders'
import { round2 } from '@/lib/vat'
import PurchaseDocument, { type DocLine, type DocParty } from '@/components/docs/PurchaseDocument'
import PrintBar from '@/components/docs/PrintBar'

interface SupplierQuote {
  supplierId: string
  name: string
  terms: string[]
  leadDays: number | null
  lines: DocLine[]
}

/**
 * The cart as quotes, one per supplier, at the prices the server reads today
 * (the cart only remembers the price an item was added at). Grouped the way the
 * cart splits into purchase orders: by the supplier each line is bought from.
 */
export default function QuoteView({ buyer }: { buyer: DocParty }) {
  const cart = useCart()
  const [products, setProducts] = useState<AppProduct[] | null>(null)
  const [failed, setFailed] = useState(false)

  const idsKey = cart.items.map((item) => item.id).sort().join(',')
  useEffect(() => {
    if (!idsKey) return
    let live = true
    fetch('/api/app/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsKey.split(',') }) })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { products: AppProduct[] }) => live && setProducts(data.products))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [idsKey])

  if (cart.items.length === 0) {
    return (
      <Empty>
        העגלה ריקה, אז אין ממה להפיק הצעת מחיר.
        <Link href="/app/catalog" className="mt-3 inline-flex h-11 items-center rounded-[11px] bg-stone-900 px-4 font-bold text-white">
          לקטלוג
        </Link>
      </Empty>
    )
  }
  if (failed) return <Empty>לא הצלחתי לקרוא את המחירים העדכניים. נסה שוב בעוד רגע.</Empty>
  if (!products) return <Empty>מכין את הצעת המחיר...</Empty>

  const groups = new Map<string, SupplierQuote>()
  for (const item of cart.items) {
    const product = products.find((p) => p.id === item.id)
    const offer: AppOffer | null = product ? product.offers.find((o) => o.supplierId === item.supplier_id) ?? suggestedOffer(product) : null
    // A product no supplier sells any more has no price to quote
    if (!product || !offer || offer.price == null) continue
    const group = groups.get(offer.supplierId) ?? { supplierId: offer.supplierId, name: offer.supplierName, terms: offer.terms, leadDays: offer.leadDays, lines: [] }
    group.lines.push({
      name: product.name,
      quantity: quantityText({ quantity: item.quantity, unit: product.unit, packLabel: offer.packLabel, packQty: offer.packQty }),
      unitPrice: offer.price,
      unit: product.unit,
      lineTotal: round2(offer.price * item.quantity),
    })
    groups.set(offer.supplierId, group)
  }
  const quotes = [...groups.values()]
  const missing = cart.items.length - quotes.reduce((n, q) => n + q.lines.length, 0)
  const date = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })

  return (
    <div className="min-h-dvh bg-stone-100 print:bg-white">
      <PrintBar back="/app/order" backLabel="לעגלה" count={quotes.length} />
      {(quotes.length > 1 || missing > 0) && (
        <p className="mx-auto max-w-[800px] px-4 pt-3 text-sm text-stone-600 print:hidden">
          {quotes.length > 1 && `הצעה נפרדת לכל ספק (${quotes.length} ספקים), כמו שההזמנה תתפצל.`}
          {missing > 0 && ` ${missing} פריטים מהעגלה לא נמכרים כרגע באתר ולא נכללו.`}
        </p>
      )}
      <div className="grid gap-4 p-3 sm:p-6 print:block print:p-0">
        {quotes.map((quote) => (
          <PurchaseDocument
            key={quote.supplierId}
            kind="quote"
            date={date}
            supplier={{ name: quote.name, terms: quote.terms, leadDays: quote.leadDays }}
            buyer={buyer}
            lines={quote.lines}
          />
        ))}
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-10 flex max-w-md flex-col items-start rounded-2xl bg-white p-5 text-[15px] text-stone-700">{children}</div>
}
