'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { FileText, Plus, Sparkles } from 'lucide-react'
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
    // A dark card with a slowly turning light around its edge: the one place in the
    // light catalogue that is meant to stand out. Motion stops under reduced motion.
    <section aria-label="מוצר השבוע · פרסומת" className="relative isolate overflow-hidden rounded-[22px] p-[1.5px] shadow-[0_18px_44px_-12px_rgba(242,154,18,.45)]">
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_7s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,#F29A12_60deg,#FFE2A8_90deg,transparent_150deg,transparent_200deg,#5B8DEF_250deg,transparent_310deg)] motion-reduce:animate-none"
      />
      <div className="relative overflow-hidden rounded-[20.5px] bg-navy-deep text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(242,154,18,.28),transparent_55%),radial-gradient(90%_80%_at_0%_100%,rgba(91,141,239,.22),transparent_60%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:22px_22px]"
        />

        <div className="relative flex items-center justify-between gap-2 px-4 pt-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-brand to-[#FFC65C] px-3 py-1 text-[12.5px] font-extrabold text-navy shadow-[0_0_18px_rgba(242,154,18,.55)]">
            <Sparkles size={14} strokeWidth={2.4} />
            מוצר השבוע
          </span>
          <span className="text-[10.5px] tracking-wide text-white/55">פרסומת</span>
        </div>

        <div className="relative grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 p-4 md:grid-cols-[120px_minmax(0,1fr)_auto] md:gap-5 md:p-5">
          <Link
            href={`/app/product/${product.id}`}
            tabIndex={-1}
            aria-hidden
            className="rounded-2xl ring-1 ring-white/15 shadow-[0_0_0_6px_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.35)]"
          >
            <ProductImage src={product.imageUrl} icon={product.icon} size="h-[88px] w-[88px] rounded-2xl md:h-[120px] md:w-[120px]" glyph={36} />
          </Link>
          <div className="grid min-w-0 gap-1">
            <Link href={`/app/product/${product.id}`} className="text-[19px] font-extrabold leading-snug text-white md:text-[22px]">
              {product.name}
            </Link>
            <span className="flex items-center gap-1.5 truncate text-[13.5px] text-white/70">
              <SupplierLogo url={offer.supplierLogo} size={18} />
              {offer.supplierName}
              {pack && <> · {pack}</>}
            </span>
            {!slot.showPrice ? null : showPrices && offer.quoteOnly ? (
              <span className="text-[15px] font-semibold text-[#FFD48A]">מחיר בהצעה מהספק</span>
            ) : showPrices && offer.price != null ? (
              <span className="text-[15px]">
                <b className="tnum text-[22px] font-extrabold text-[#FFC65C]">{money(offer.price)}</b>{' '}
                <small className="text-[12.5px] text-white/60">ל{product.unit} · לפני מע״מ</small>
              </span>
            ) : (
              <span className="text-[13px] text-white/60">מחיר לנגריות רשומות</span>
            )}
            {product.description && (
              <p className="m-0 mt-0.5 line-clamp-2 text-[13.5px] text-white/70">{product.description}</p>
            )}
          </div>
          {showPrices && (
            <div className="col-span-2 md:col-span-1">
              {line?.quote_id ? (
                <span className="text-sm font-semibold text-[#8FE3B0]">בהזמנה, לפי הצעת מחיר</span>
              ) : offer.quoteOnly ? (
                <Link
                  href={`/app/product/${product.id}?quote=1`}
                  className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand px-6 text-[15px] font-bold text-navy shadow-[0_0_24px_rgba(242,154,18,.5)] hover:bg-brand-hover md:w-auto"
                >
                  <FileText size={18} />
                  בקש הצעת מחיר
                </Link>
              ) : line ? (
                <div className="rounded-[12px] bg-white p-1">
                  <Stepper
                    value={Math.round(line.quantity / step)}
                    onChange={(packs) => cart.updateQuantity(product.id, packs * step)}
                    tone="cart"
                    label={product.name}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={add}
                  disabled={!offer.inStock || offer.price == null}
                  className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand px-6 text-[15px] font-bold text-navy shadow-[0_0_24px_rgba(242,154,18,.5)] transition hover:bg-brand-hover hover:shadow-[0_0_32px_rgba(242,154,18,.75)] disabled:bg-white/15 disabled:text-white/50 disabled:shadow-none md:w-auto"
                >
                  <Plus size={18} strokeWidth={2.2} />
                  הוסף להזמנה
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
