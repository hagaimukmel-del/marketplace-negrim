'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Check, Info, Plus, Repeat, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money, packText, termsText, when } from '@/lib/app/format'
import { sortedOffers, stepOf, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import CategoryGlyph from '@/components/app/CategoryGlyph'
import Stepper from '@/components/app/Stepper'
import { BackLink } from '@/components/app/ui'

export interface LastPurchase {
  quantity: number
  unitPrice: number
  supplierId: string
  at: string
}

function Reason({ product, offer }: { product: AppProduct; offer: AppOffer }) {
  if (product.offers.length === 1) return null
  if (!offer.inStock) return <span className="text-[12.5px] font-semibold text-red-700">אזל</span>
  if (offer.suggested) return <span className="whitespace-nowrap rounded-full bg-ok-soft px-2 py-px text-[12.5px] font-semibold text-ok-ink">הזול במלאי</span>
  const best = suggestedOffer(product)
  if (best?.price != null && offer.price != null) return <span className="text-[12.5px] text-muted">יקר ב-<span className="tnum">{money(offer.price - best.price)}</span></span>
  return null
}

/**
 * The product page. The price is the anchor; under it, from whom and why that
 * supplier was suggested, with a way to switch. What this carpentry bought last
 * time is a quiet line, and the quantity starts where it was then — so there is
 * one add action, not two.
 */
export default function ProductView({
  product,
  showPrices,
  last,
  now,
  crumbs,
}: {
  product: AppProduct
  showPrices: boolean
  last: LastPurchase | null
  now: number
  crumbs: { topId: string | null; top: string; sub: string | null }
}) {
  const cart = useCart()
  const inCart = cart.items.find((item) => item.id === product.id)
  const [supplierId, setSupplierId] = useState<string>(() => inCart?.supplier_id ?? suggestedOffer(product)?.supplierId ?? '')
  const [sheet, setSheet] = useState(false)
  const offer = product.offers.find((o) => o.supplierId === supplierId) ?? suggestedOffer(product)!
  const step = stepOf(offer)
  const [packs, setPacks] = useState(() => (last && last.supplierId === offer.supplierId ? Math.max(1, Math.round(last.quantity / step)) : 1))
  const [added, setAdded] = useState(false)
  const lastPacks = last ? Math.round(last.quantity / step) : null
  const pack = packText(offer.packLabel, offer.packQty, product.unit)
  const total = (offer.price ?? 0) * packs * step

  const choose = (id: string) => {
    setSupplierId(id)
    setSheet(false)
  }

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
      packs * step
    )
    setAdded(true)
  }

  const lastOffer = last ? product.offers.find((o) => o.supplierId === last.supplierId) : null
  const priceDiff = last && lastOffer?.price != null ? (lastOffer.price - last.unitPrice) * (lastOffer.packQty ?? 1) : 0

  const priceBlock = (
    <section className="grid gap-1.5 rounded-2xl border border-hair bg-white px-4 py-3.5">
      {showPrices && offer.price != null ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <b className="tnum text-[32px] font-extrabold leading-none">{money(offer.price)}</b>
            <span className="text-sm text-muted">ל{product.unit} · לפני מע״מ</span>
          </div>
          {offer.packQty && offer.packQty > 1 && (
            <div className="text-[15px]">
              {pack} · <span className="tnum">{money(offer.price * offer.packQty)}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-[15px] text-muted">
          המחיר מוצג לנגריות רשומות. <Link href="/join" className="font-bold text-brand-ink">כניסה / הרשמה</Link>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-hair pt-2.5 text-[15px]">
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Building2 size={17} className="text-muted" />
          {offer.supplierName}
        </span>
        {offer.suggested ? <Reason product={product} offer={offer} /> : <span className="text-[13.5px] text-muted">בחרת ספק אחר</span>}
        {product.offers.length > 1 && (
          <button type="button" onClick={() => setSheet(true)} className="ms-auto text-sm font-semibold text-brand-ink md:hidden">
            החלף ספק · <span className="tnum">{product.offers.length}</span>
          </button>
        )}
        {!offer.suggested && (
          <button type="button" onClick={() => choose(suggestedOffer(product)!.supplierId)} className="text-sm font-semibold text-brand-ink md:ms-auto">
            חזור להצעה
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[13.5px] text-muted">
        {offer.leadDays != null && <span>אספקה עד {offer.leadDays} ימי עסקים</span>}
        <span>{termsText(offer.terms)}</span>
        {offer.minOrder ? <span>מינימום הזמנה <span className="tnum">{money(offer.minOrder)}</span></span> : null}
        {!offer.inStock && <span className="font-semibold text-red-700">אזל אצל הספק</span>}
      </div>
      {inCart && (
        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok-ink">
          <Check size={15} strokeWidth={2.6} /> כבר בהזמנה: <span className="tnum">{Math.round(inCart.quantity / stepOf({ packQty: inCart.pack_qty ?? null }))}</span> × {packText(inCart.pack_label ?? null, inCart.pack_qty ?? null, product.unit) ?? product.unit}
        </div>
      )}
    </section>
  )

  const lastLine = last && showPrices && (
    <div className="flex items-start gap-2 px-1 text-sm text-muted">
      <Repeat size={17} className="mt-0.5 shrink-0" />
      <span>
        הזמנת {when(last.at, now)}: <b className="tnum text-ink">{lastPacks}</b> × {packText(lastOffer?.packLabel ?? null, lastOffer?.packQty ?? null, product.unit) ?? product.unit}
        {last.supplierId !== offer.supplierId && lastOffer ? ` מ${lastOffer.supplierName}` : ''}, <span className="tnum">{money(last.unitPrice * (lastOffer?.packQty ?? 1))}</span>
        {lastOffer?.packQty ? ` ל${lastOffer.packLabel ?? 'אריזה'}` : ` ל${product.unit}`}
        {priceDiff > 0.001 && <b className="font-bold text-attn"> · עלה ב-<span className="tnum">{money(priceDiff)}</span></b>}
        {priceDiff < -0.001 && <b className="font-bold text-ok"> · ירד מאז</b>}
      </span>
    </div>
  )

  const details = (product.attributes.length > 0 || product.brand) && (
    <section>
      <h3 className="mb-2 text-base font-bold">פרטי המוצר</h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl border border-hair bg-white p-3.5 text-[14.5px]">
        {product.brand && (
          <>
            <dt className="text-muted">מותג</dt>
            <dd className="m-0 font-semibold">{product.brand}</dd>
          </>
        )}
        {product.attributes.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted">{key}</dt>
            <dd className="m-0 font-semibold">{value}</dd>
          </div>
        ))}
        <dt className="text-muted">יחידת מחיר</dt>
        <dd className="m-0 font-semibold">{product.unit}</dd>
      </dl>
    </section>
  )

  const addButton = (full: boolean) => (
    <button
      type="button"
      onClick={add}
      disabled={!offer.inStock || offer.price == null}
      className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-[11px] bg-brand px-4 font-bold text-navy hover:bg-brand-hover disabled:bg-[#EFE9E0] disabled:text-faint ${full ? 'w-full' : 'flex-1'}`}
    >
      {added ? (
        <>
          <Check size={18} strokeWidth={2.4} /> נוסף
        </>
      ) : full ? (
        <>
          <Plus size={18} strokeWidth={2.2} /> הוסף להזמנה
        </>
      ) : (
        'הוסף'
      )}
    </button>
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-24 md:pb-0">
      <BackLink href={crumbs.topId ? `/app/catalog/${crumbs.topId}` : '/app/catalog'} label={crumbs.sub ? `${crumbs.top} › ${crumbs.sub}` : crumbs.top} />
      <div className="flex items-center gap-3">
        <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[14px] bg-wood-soft text-[#7A5A3A]">
          <CategoryGlyph icon={product.icon} size={30} />
        </span>
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-extrabold leading-tight md:text-[28px]">{product.name}</h1>
          {product.mpn && <div className="text-sm text-muted">דגם {product.mpn}</div>}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {priceBlock}
          {lastLine}
          {product.offers.length > 1 && showPrices && (
            <section className="hidden md:block">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="m-0 text-base font-bold">השוואת ספקים</h3>
                <span className="text-[13.5px] text-muted">במלאי קודם, ואז המחיר ליחידה</span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-hair bg-white">
                <table className="w-full border-collapse text-[14.5px]">
                  <thead>
                    <tr className="bg-[#FBF9F6] text-[12.5px] text-muted">
                      {['ספק', 'ליחידה', 'אריזה', 'אספקה', 'תשלום', 'מינימום', ''].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-start font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOffers(product).map((o) => (
                      <tr key={o.supplierId} className={`border-t border-hair ${o.supplierId === offer.supplierId ? 'bg-[#F6F8FB]' : ''}`}>
                        <td className="px-3 py-2.5">
                          <b>{o.supplierName}</b> <Reason product={product} offer={o} />
                        </td>
                        <td className="tnum px-3 py-2.5 font-bold">{o.price != null ? money(o.price) : '—'}</td>
                        <td className="px-3 py-2.5">{packText(o.packLabel, o.packQty, product.unit) ?? '—'}</td>
                        <td className="px-3 py-2.5">{o.leadDays != null ? `עד ${o.leadDays} ימים` : '—'}</td>
                        <td className="px-3 py-2.5">{termsText(o.terms)}</td>
                        <td className="tnum px-3 py-2.5">{o.minOrder ? money(o.minOrder) : '—'}</td>
                        <td className="px-3 py-2.5 text-end">
                          {o.supplierId === offer.supplierId ? (
                            <span className="inline-flex items-center gap-1 text-[13.5px] font-bold text-navy">
                              <Check size={14} strokeWidth={3} /> נבחר
                            </span>
                          ) : (
                            <button type="button" disabled={!o.inStock} onClick={() => choose(o.supplierId)} className="h-[38px] rounded-[11px] border-[1.5px] border-hair bg-white px-3 text-sm font-bold disabled:opacity-50">
                              בחר
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {details}
        </div>

        {/* Desktop buy box */}
        {showPrices && (
          <section className="sticky top-[90px] hidden gap-3 rounded-2xl border border-hair bg-white p-3.5 md:grid">
            <div className="flex items-baseline justify-between">
              <h3 className="m-0 text-base font-bold">כמות</h3>
              <span className="text-muted">{pack ?? product.unit}</span>
            </div>
            <div className="flex items-center gap-3">
              <Stepper value={packs} onChange={(n) => { setPacks(Math.max(1, n)); setAdded(false) }} min={1} label={product.name} />
              <div>
                <b className="tnum text-[22px]">{money(total)}</b>
                <div className="text-[13px] text-muted">
                  <span className="tnum">{packs * step}</span> {product.unit}
                  {lastPacks && packs === lastPacks ? ' · כמו בפעם הקודמת' : ''}
                </div>
              </div>
            </div>
            {addButton(true)}
          </section>
        )}
      </div>

      {/* Phone action bar */}
      {showPrices && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 flex items-center gap-2.5 border-t border-hair bg-white/[.98] px-4 py-2.5 shadow-[0_-6px_16px_rgba(30,42,59,.06)] md:hidden">
          <Stepper value={packs} onChange={(n) => { setPacks(Math.max(1, n)); setAdded(false) }} min={1} label={product.name} />
          <div className="grid leading-tight">
            <b className="tnum text-[17px]">{money(total)}</b>
            <small className="text-[12.5px] text-muted">
              <span className="tnum">{packs * step}</span> {product.unit}
              {lastPacks && packs === lastPacks ? ' · כמו פעם קודמת' : ''}
            </small>
          </div>
          {addButton(false)}
        </div>
      )}

      {/* Supplier sheet (phone) */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(15,20,28,.42)] md:hidden" onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="בחירת ספק" className="max-h-[88%] w-full overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded bg-[#D6D3CE]" />
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[19px] font-bold">בחירת ספק</h3>
              <button type="button" onClick={() => setSheet(false)} aria-label="סגירה" className="grid h-9 w-9 place-items-center rounded-full text-muted">
                <X size={20} />
              </button>
            </div>
            <p className="m-0 text-sm text-muted">{product.name} · במלאי קודם, ואז המחיר הנמוך ל{product.unit}</p>
            <div className="mt-3 grid gap-2.5">
              {sortedOffers(product).map((o) => {
                const chosen = o.supplierId === offer.supplierId
                return (
                  <button
                    key={o.supplierId}
                    type="button"
                    disabled={!o.inStock}
                    onClick={() => choose(o.supplierId)}
                    aria-pressed={chosen}
                    className={`grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border-[1.5px] bg-white p-3 text-start disabled:opacity-55 ${chosen ? 'border-navy shadow-[0_0_0_3px_rgba(30,42,59,.07)]' : 'border-hair'}`}
                  >
                    <span className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 text-white ${chosen ? 'border-navy bg-navy' : 'border-[#CBD2DA]'}`}>
                      {chosen && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="grid min-w-0 leading-snug">
                      <b className="text-[15.5px]">{o.supplierName}</b>
                      <small className="text-[12.5px] text-muted">
                        {packText(o.packLabel, o.packQty, product.unit) ?? product.unit}
                        {o.leadDays != null ? ` · עד ${o.leadDays} ימי עסקים` : ''} · {termsText(o.terms)}
                      </small>
                    </span>
                    <span className="grid justify-items-end leading-tight">
                      <b className="tnum text-lg font-extrabold">{o.price != null ? money(o.price) : '—'}</b>
                      <small className="inline-flex items-center gap-1 text-xs text-muted">
                        ל{product.unit} <Reason product={product} offer={o} />
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 mb-0 flex items-start gap-2 text-[13.5px] text-muted">
              <Info size={16} className="mt-0.5 shrink-0 text-navy" />
              הבחירה חלה על השורה הזו בהזמנה. בפעם הבאה המערכת שוב תציע את הספק המתאים.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
