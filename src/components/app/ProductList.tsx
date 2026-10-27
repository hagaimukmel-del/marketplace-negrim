'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { FileText, ImageIcon, MapPin, Plus, SlidersHorizontal } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money } from '@/lib/app/format'
import { stepOf, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import { NO_FILTERS, SORTS, activeCount, applyFilters, filterOptions, filtersToParams, parseFilters, type CatalogFilters, type SortKey } from '@/lib/app/catalog-filters'
import FilterSheet from './FilterSheet'
import ProductImage from './ProductImage'
import Stepper from './Stepper'

/**
 * Products as cards led by the photo: a carpenter on a job site spots and taps
 * a picture faster than a line of text. Under it one price, one supplier line
 * and one big action. Once a product is in the order its button becomes a
 * quantity stepper, so the carpenter never has to leave the list. "במלאי" is
 * not printed on every card — only the exception, "אזל".
 *
 * Above the cards: a sort and the filters (lib/app/catalog-filters). They live
 * in the URL, so the list is the same after opening a product and coming back,
 * and a filtered list can be sent to someone. `myRegions` is the signed-in
 * carpentry's region, for the "באזור שלי" shortcut.
 */
export default function ProductList({
  products,
  showPrices,
  filters = true,
  myRegions = [],
}: {
  products: AppProduct[]
  showPrices: boolean
  filters?: boolean
  myRegions?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [sheet, setSheet] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)

  const current = filters ? parseFilters(new URLSearchParams(params.toString())) : NO_FILTERS
  const options = filterOptions(products)
  const set = (next: CatalogFilters) => {
    const query = filtersToParams(next, new URLSearchParams(params.toString())).toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Only worth offering when some product is actually out of stock
  const anyOut = products.some((p) => !suggestedOffer(p)?.inStock)
  let items = applyFilters(products, current)
  if (inStockOnly) items = items.filter((p) => suggestedOffer(p)?.inStock)

  const sorts = SORTS.filter((sort) => showPrices || !sort.key.startsWith('price'))
  const regionKeys = new Set(options.regions.map((region) => region.key))
  const mine = myRegions.filter((region) => regionKeys.has(region))
  const mineOn = mine.length > 0 && current.regions.length === mine.length && mine.every((region) => current.regions.includes(region))
  const count = activeCount(current)
  const canFilter = Boolean(options.suppliers.length || options.regions.length || options.brands.length || options.imageSplit || (showPrices && options.priceRanges.length))

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
        <div className="grid gap-2">
          {/* Phone: the filter button and the sort on one line, the quick chips scrolling under them. */}
          <div className="flex flex-wrap items-center gap-2">
            {canFilter && (
              <button
                type="button"
                onClick={() => setSheet(true)}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-bold ${count ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'}`}
              >
                <SlidersHorizontal size={17} /> סינון
                {count > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[12px] text-navy">{count}</span>}
              </button>
            )}
            {(options.imageSplit || mine.length > 0 || anyOut) && (
              <div className="-mx-4 order-last flex basis-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:order-none md:mx-0 md:basis-auto md:px-0">
                {options.imageSplit && (
                  <QuickChip active={current.withImage} onClick={() => set({ ...current, withImage: !current.withImage })}>
                    <ImageIcon size={16} /> עם תמונה
                  </QuickChip>
                )}
                {mine.length > 0 && (
                  <QuickChip active={mineOn} onClick={() => set({ ...current, regions: mineOn ? [] : mine })}>
                    <MapPin size={16} /> ספקים באזור שלי
                  </QuickChip>
                )}
                {anyOut && (
                  <QuickChip active={inStockOnly} onClick={() => setInStockOnly((v) => !v)}>
                    רק במלאי
                  </QuickChip>
                )}
              </div>
            )}
            <label className="ms-auto inline-flex h-10 shrink-0 items-center gap-1.5 text-[13.5px] text-muted">
              <span className="max-sm:sr-only">מיון</span>
              <select
                value={current.sort}
                onChange={(e) => set({ ...current, sort: e.target.value as SortKey })}
                aria-label="מיון"
                className="h-10 rounded-full border border-hair bg-white ps-3 pe-2 text-[14px] font-semibold text-ink"
              >
                {sorts.map((sort) => (
                  <option key={sort.key} value={sort.key}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(count > 0 || inStockOnly) && (
            <div className="flex items-center gap-2 text-[13.5px] text-muted">
              <span>
                <span className="tnum font-semibold text-ink">{items.length}</span> מתוך <span className="tnum">{products.length}</span> מוצרים
              </span>
              <button
                type="button"
                onClick={() => {
                  setInStockOnly(false)
                  set({ ...NO_FILTERS, sort: current.sort })
                }}
                className="font-semibold text-brand-ink"
              >
                נקה סינון
              </button>
            </div>
          )}
          {sheet && (
            <FilterSheet
              products={products}
              options={options}
              value={current}
              showPrices={showPrices}
              myRegions={mine}
              onApply={(next) => {
                set(next)
                setSheet(false)
              }}
              onClose={() => setSheet(false)}
            />
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
          <b className="block text-ink">אין מוצרים שמתאימים לסינון</b>
          <button
            type="button"
            className="font-semibold text-brand-ink"
            onClick={() => {
              setInStockOnly(false)
              set({ ...NO_FILTERS, sort: current.sort })
            }}
          >
            הצג את כל המוצרים
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

function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-semibold ${active ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'}`}
    >
      {children}
    </button>
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
