'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { FileText, Plus } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money, packText } from '@/lib/app/format'
import { stepOf, type AppOffer, type AppProduct } from '@/lib/app/products'
import ProductImage from './ProductImage'
import SupplierLogo from './SupplierLogo'
import Stepper from './Stepper'

export interface PromotedSlot {
  weekId: string
  product: AppProduct
  /** The paying supplier's own offer: the card always sells from them. */
  offer: AppOffer
  /** The supplier asked for their price on the card; otherwise it shows none. */
  showPrice: boolean
}

function send(weekId: string, kind: 'view' | 'add', placement: 'home' | 'category') {
  void fetch('/api/promo/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_id: weekId, kind, placement }),
    keepalive: true,
  }).catch(() => {})
}

/**
 * "מוצר השבוע": the one product a supplier paid to show this week (T-024).
 *
 * Labelled "פרסומת" every time it appears, so a carpenter never mistakes it
 * for a neutral pick. The price shows only when the supplier asked for it. It sells from the supplier who booked the week, at their
 * own price. A view is counted once per page load and every add-to-cart, for
 * the results both the supplier and the operator see.
 */
export default function PromotedCard({
  slot,
  placement,
  showPrices,
}: {
  slot: PromotedSlot
  placement: 'home' | 'category'
  showPrices: boolean
}) {
  const { product, offer, weekId } = slot
  const cart = useCart()
  const counted = useRef(false)
  const line = cart.items.find((item) => item.id === product.id)
  const step = stepOf(line ? { packQty: line.pack_qty ?? null } : offer)
  const pack = packText(offer.packLabel, offer.packQty, product.unit)

  useEffect(() => {
    if (counted.current) return
    counted.current = true
    send(weekId, 'view', placement)
  }, [weekId, placement])

  const add = () => {
    if (offer.price == null) return
    cart.addItem(
      {
        id: product.id,
        name_he: product.name,
        name_en: '',
        base_price_excl_vat: offer.price,
        supplier_id: offer.supplierId,
        supplier_name: offer.supplierName,
        unit: product.unit,
        pack_label: offer.packLabel,
        pack_qty: offer.packQty,
      },
      stepOf(offer)
    )
    send(weekId, 'add', placement)
  }

  return (
    <section
      aria-label="מוצר השבוע"
      className="overflow-hidden rounded-2xl border-[1.5px] border-[#E6D6C2] bg-white shadow-[0_8px_24px_rgba(30,42,59,.06)]"
    >
      <div className="flex items-center justify-between gap-2 bg-wood-soft px-4 py-2">
        <span className="text-[13px] font-extrabold text-[#6B4E2E]">מוצר השבוע</span>
        <span className="text-[11px] text-muted">פרסומת</span>
      </div>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3.5 p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]">
        <Link href={`/app/product/${product.id}`} tabIndex={-1} aria-hidden>
          <ProductImage src={product.imageUrl} icon={product.icon} size="h-[72px] w-[72px] rounded-xl md:h-24 md:w-24" glyph={30} />
        </Link>
        <div className="grid min-w-0 gap-0.5">
          <Link href={`/app/product/${product.id}`} className="text-[17px] font-bold leading-snug text-ink">
            {product.name}
          </Link>
          <span className="flex items-center gap-1.5 truncate text-[13.5px] text-muted">
            <SupplierLogo url={offer.supplierLogo} size={18} />
            {offer.supplierName}
            {pack && <> · {pack}</>}
          </span>
          {!slot.showPrice ? null : showPrices && offer.quoteOnly ? (
            <span className="text-[15px] font-semibold">מחיר בהצעה מהספק</span>
          ) : showPrices && offer.price != null ? (
            <span className="text-[15px]">
              <b className="tnum text-lg font-extrabold">{money(offer.price)}</b>{' '}
              <small className="text-[12.5px] text-muted">ל{product.unit} · לפני מע״מ</small>
            </span>
          ) : (
            <span className="text-[13px] text-muted">מחיר לנגריות רשומות</span>
          )}
          {product.description && (
            <p className="m-0 mt-1 line-clamp-2 text-[13.5px] text-muted">{product.description}</p>
          )}
        </div>
        {showPrices && (
          <div className="col-span-2 md:col-span-1">
            {line?.quote_id ? (
              <span className="text-sm font-semibold text-ok-ink">בהזמנה, לפי הצעת מחיר</span>
            ) : offer.quoteOnly ? (
              <Link
                href={`/app/product/${product.id}?quote=1`}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand px-5 text-[15px] font-bold text-navy hover:bg-brand-hover md:w-auto"
              >
                <FileText size={18} />
                בקש הצעת מחיר
              </Link>
            ) : line ? (
              <Stepper
                value={Math.round(line.quantity / step)}
                onChange={(packs) => cart.updateQuantity(product.id, packs * step)}
                tone="cart"
                label={product.name}
              />
            ) : (
              <button
                type="button"
                onClick={add}
                disabled={!offer.inStock || offer.price == null}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand px-5 text-[15px] font-bold text-navy hover:bg-brand-hover disabled:bg-[#EFE9E0] disabled:text-faint md:w-auto"
              >
                <Plus size={18} strokeWidth={2.2} />
                הוסף להזמנה
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
