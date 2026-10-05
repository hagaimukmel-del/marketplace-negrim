'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money, packText } from '@/lib/app/format'
import { stepOf, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import ProductImage from './ProductImage'
import Stepper from './Stepper'

/**
 * Products as rows: one price, one supplier line, one action. Once a product is
 * in the order its button becomes a quantity stepper, so the carpenter never
 * has to leave the list. "במלאי" is not printed on every row — only the
 * exception, "אזל".
 */
export default function ProductList({ products, showPrices, filters = true }: { products: AppProduct[]; showPrices: boolean; filters?: boolean }) {
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<'best' | 'price'>('best')

  // Only worth offering when some product is actually out of stock
  const anyOut = products.some((p) => !suggestedOffer(p)?.inStock)
  let items = products
  if (inStockOnly) items = items.filter((p) => suggestedOffer(p)?.inStock)
  if (sort === 'price') items = [...items].sort((a, b) => (suggestedOffer(a)?.price ?? 0) - (suggestedOffer(b)?.price ?? 0))

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
        <>
          {/* Phone: rows */}
          <div className="overflow-hidden rounded-2xl border border-hair bg-white md:hidden">
            {items.map((product) => (
              <Row key={product.id} product={product} showPrices={showPrices} />
            ))}
          </div>
          {/* Desktop: a dense table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-hair bg-white md:block">
            <table className="w-full border-collapse text-[14.5px]">
              <thead>
                <tr className="bg-[#FBF9F6] text-start text-[12.5px] text-muted">
                  <th className="px-3 py-2.5 text-start font-bold">מוצר</th>
                  <th className="px-3 py-2.5 text-start font-bold">ספק מוצע</th>
                  <th className="px-3 py-2.5 text-start font-bold">אריזה</th>
                  {showPrices && <th className="px-3 py-2.5 text-end font-bold">ליחידה</th>}
                  {showPrices && <th className="px-3 py-2.5 text-end font-bold">לאריזה</th>}
                  <th className="px-3 py-2.5 text-end font-bold">בהזמנה</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <TableRow key={product.id} product={product} showPrices={showPrices} />
                ))}
              </tbody>
            </table>
          </div>
        </>
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

function Row({ product, showPrices }: { product: AppProduct; showPrices: boolean }) {
  const offer = suggestedOffer(product)
  const { line, packs, add, setPacks } = useLine(product, offer)
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-t border-hair px-3.5 py-3 first:border-t-0">
      <Link href={`/app/product/${product.id}`} tabIndex={-1} aria-hidden>
        <ProductImage src={product.imageUrl} icon={product.icon} size="h-12 w-12 rounded-[10px]" glyph={22} />
      </Link>
      <Link href={`/app/product/${product.id}`} className="grid min-w-0 gap-px">
        <b className="text-[15px] leading-snug">{product.name}</b>
        <span className="truncate text-[13px] text-muted">
          {offer?.supplierName}
          {product.offers.length > 1 && (
            <>
              {' '}· <span className="tnum">{product.offers.length}</span> ספקים
            </>
          )}
          {offer && !offer.inStock && <span className="font-semibold text-red-700"> · אזל</span>}
        </span>
        {showPrices && offer?.price != null ? (
          <span className="text-[15px]">
            <b className="tnum text-base font-extrabold">{money(offer.price)}</b>{' '}
            <small className="text-[12.5px] text-muted">
              ל{product.unit}
              {offer.packQty && offer.packQty > 1 ? (
                <>
                  {' '}· {offer.packLabel ?? 'אריזה'} <span className="tnum">{money(offer.price * offer.packQty)}</span>
                </>
              ) : null}
            </small>
          </span>
        ) : (
          <span className="text-[13px] text-muted">מחיר לנגריות רשומות</span>
        )}
      </Link>
      <span>
        {!showPrices ? null : line ? (
          <Stepper value={packs} onChange={setPacks} small tone="cart" label={product.name} />
        ) : (
          <button
            type="button"
            onClick={add}
            disabled={!offer?.inStock}
            aria-label={`הוסף ${product.name} להזמנה`}
            className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-brand text-navy disabled:bg-[#EFE9E0] disabled:text-faint"
          >
            <Plus size={20} strokeWidth={2.2} />
          </button>
        )}
      </span>
    </div>
  )
}

function TableRow({ product, showPrices }: { product: AppProduct; showPrices: boolean }) {
  const offer = suggestedOffer(product)
  const { line, packs, add, setPacks } = useLine(product, offer)
  const pack = offer ? packText(offer.packLabel, offer.packQty, product.unit) : null
  return (
    <tr className="border-t border-hair hover:bg-[#FDFBF8]">
      <td className="px-3 py-2.5">
        <Link href={`/app/product/${product.id}`} className="flex items-center gap-2.5">
          <ProductImage src={product.imageUrl} icon={product.icon} size="h-9 w-9 rounded-[9px]" glyph={18} />
          <b>{product.name}</b>
        </Link>
      </td>
      <td className="px-3 py-2.5">
        {offer?.supplierName}
        {product.offers.length > 1 && <span className="text-[13px] text-muted"> · {product.offers.length} ספקים</span>}
        {offer && !offer.inStock && <span className="font-semibold text-red-700"> · אזל</span>}
      </td>
      <td className="px-3 py-2.5">{pack ?? '—'}</td>
      {showPrices && (
        <td className="px-3 py-2.5 text-end">
          <b className="tnum">{offer?.price != null ? money(offer.price) : '—'}</b> <span className="text-muted">/{product.unit}</span>
        </td>
      )}
      {showPrices && <td className="tnum px-3 py-2.5 text-end">{offer?.price != null && offer.packQty ? money(offer.price * offer.packQty) : '—'}</td>}
      <td className="px-3 py-2.5 text-end">
        {!showPrices ? null : line ? (
          <Stepper value={packs} onChange={setPacks} small tone="cart" label={product.name} />
        ) : (
          <button
            type="button"
            onClick={add}
            disabled={!offer?.inStock}
            className="inline-flex h-[38px] items-center gap-1 rounded-[11px] border-[1.5px] border-hair bg-white px-3 text-sm font-bold disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.2} /> הוסף
          </button>
        )}
      </td>
    </tr>
  )
}
