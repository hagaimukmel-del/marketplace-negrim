'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money } from '@/lib/app/format'
import { stepOf, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import ProductImage from './ProductImage'
import Stepper from './Stepper'

/**
 * Products as cards led by the photo: a carpenter on a job site spots and taps
 * a picture faster than a line of text. Under it one price, one supplier line
 * and one big action. Once a product is in the order its button becomes a
 * quantity stepper, so the carpenter never has to leave the list. "במלאי" is
 * not printed on every card — only the exception, "אזל".
 */
export default function ProductList({ products, showPrices, filters = true }: { products: AppProduct[]; showPrices: boolean; filters?: boolean }) {
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<'best' | 'price'>('best')

  // Only worth offering when some product is actually out of stock
  const anyOut = products.some((p) => !suggestedOffer(p)?.inStock)
  let items = products
  if (inStockOnly) items = items.filter((p) => suggestedOffer(p)?.inStock)
  // A price on request sorts after every priced product.
  if (sort === 'price') items = [...items].sort((a, b) => (suggestedOffer(a)?.price ?? Infinity) - (suggestedOffer(b)?.price ?? Infinity))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {!showPrices && (
        <Link href="/join" className="flex items-center justify-between gap-3 rounded-xl bg-navy-soft px-3.5 py-2.5 text-[14.5px] text-navy">
          <span>
            <b>מחירי ספקים לפני מע״מ</b> מוצגים לנגריות רשומות. ההרשמה חינם.
          </span>
          <span className="shrink-0 font-bold underline underline-offset-2">להרשמה</span>
        </Link>
      )}
      {filters && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {anyOut && (
            <button
              type="button"
              aria-pressed={inStockOnly}
              onClick={() => setInStockOnly((v) => !v)}
              className={`rounded-full border px-3 py-1 text-[13.5px] font-semibold ${inStockOnly ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'}`}
            >
              רק במלאי
            </button>
          )}
          <span className="flex-1" />
          {showPrices && (
            <label className="inline-flex items-center gap-1.5 text-[13.5px]">
              מיון
              <select value={sort} onChange={(e) => setSort(e.target.value as 'best' | 'price')} className="rounded-lg border border-hair bg-white px-2 py-1 text-[13.5px]">
                <option value="best">מומלץ</option>
                <option value="price">מחיר ליחידה</option>
              </select>
            </label>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
          <b className="block text-ink">אין מוצרים שמתאימים לסינון</b>
          <button type="button" className="font-semibold text-brand-ink" onClick={() => setInStockOnly(false)}>
            הצג גם מוצרים שאזלו
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3.5 lg:grid-cols-4">
          {items.map((product) => (
            <Card key={product.id} product={product} showPrices={showPrices} />
          ))}
        </div>
      )}
    </div>
  )
}

function useLine(product: AppProduct, offer: AppOffer | null) {
  const cart = useCart()
  const line = cart.items.find((item) => item.id === product.id)
  const step = stepOf(line ? { packQty: line.pack_qty ?? null } : offer)
  const add = () => {
    if (!offer || offer.price == null) return
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
  }
  const setPacks = (packs: number) => cart.updateQuantity(product.id, packs * step)
  return { line, packs: line ? Math.round(line.quantity / step) : 0, add, setPacks }
}

function Card({ product, showPrices }: { product: AppProduct; showPrices: boolean }) {
  const offer = suggestedOffer(product)
  const { line, packs, add, setPacks } = useLine(product, offer)
  const href = `/app/product/${product.id}`
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hair bg-white">
      <ProductImage
        src={product.imageUrl}
        icon={product.icon}
        size="aspect-square w-full border-x-0 border-t-0 p-2"
        glyph={56}
        zoom={product.name}
        href={href}
        wrap="block w-full"
      />
      <div className="flex flex-1 flex-col gap-1 p-2.5 md:p-3">
        <Link href={href} className="line-clamp-2 text-[15px] font-bold leading-snug md:text-base">
          {product.name}
        </Link>
        <span className="truncate text-[12.5px] text-muted">
          {offer?.supplierName}
          {product.offers.length > 1 && (
            <>
              {' '}· <span className="tnum">{product.offers.length}</span> ספקים
            </>
          )}
          {offer && !offer.inStock && <span className="font-semibold text-red-700"> · אזל</span>}
        </span>
        <span className="mt-auto pt-1">
          {showPrices && offer?.quoteOnly ? (
            <span className="text-[14px] font-semibold text-ink">מחיר בהצעה מהספק</span>
          ) : showPrices && offer?.price != null ? (
            <span className="grid leading-tight">
              <span>
                <b className="tnum text-lg font-extrabold">{money(offer.price)}</b>{' '}
                <small className="text-[12px] text-muted">ל{product.unit}</small>
              </span>
              {offer.packQty && offer.packQty > 1 ? (
                <small className="text-[12px] text-muted">
                  {offer.packLabel ?? 'אריזה'} <span className="tnum">{money(offer.price * offer.packQty)}</span>
                </small>
              ) : offer.packLabel ? (
                <small className="text-[12px] text-muted">{offer.packLabel}</small>
              ) : null}
            </span>
          ) : (
            <span className="text-[13px] text-muted">מחיר לנגריות רשומות</span>
          )}
        </span>
        <div className="mt-1.5">
          {!showPrices ? (
            <Link href={href} className="flex h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-hair bg-white text-[15px] font-bold">
              לפרטים
            </Link>
          ) : line?.quote_id ? (
            <span className="flex h-11 items-center justify-center text-[13px] font-semibold text-ok-ink">בהזמנה, לפי הצעה</span>
          ) : line ? (
            <div className="flex justify-center">
              <Stepper value={packs} onChange={setPacks} tone="cart" label={product.name} />
            </div>
          ) : offer?.quoteOnly ? (
            <Link
              href={`${href}?quote=1`}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-hair bg-white text-[15px] font-bold text-navy"
            >
              <FileText size={18} /> בקש הצעה
            </Link>
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={!offer?.inStock}
              aria-label={`הוסף ${product.name} להזמנה`}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-[15px] font-bold text-navy hover:bg-brand-hover disabled:bg-[#EFE9E0] disabled:text-faint"
            >
              <Plus size={19} strokeWidth={2.4} /> הוסף
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
