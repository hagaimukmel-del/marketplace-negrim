'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, FileText, Info, LayoutGrid, Plus, Search, Trash2, Truck, X } from 'lucide-react'
import { useCart, type CartItem } from '@/lib/cart-context'
import { money, packText, termsText } from '@/lib/app/format'
import { sortedOffers, stepOf, suggestedOffer, type AppOffer, type AppProduct } from '@/lib/app/products'
import { VAT_RATE } from '@/lib/vat'
import CategoryGlyph from '@/components/app/CategoryGlyph'
import Stepper from '@/components/app/Stepper'
import { AttentionLine } from '@/components/app/ui'

interface Quote {
  products: AppProduct[]
  suggestions: Record<string, AppProduct[]>
}

interface Line {
  item: CartItem
  product: AppProduct | null
  offer: AppOffer | null
  price: number
  step: number
  total: number
}

interface Group {
  supplierId: string
  name: string
  terms: string[]
  leadDays: number | null
  min: number
  total: number
  short: number
  lines: Line[]
}

interface SentOrder {
  id: string
  shortNumber: number
  supplierName: string | null
  subtotalExclVat: number
}

/**
 * The order screen. The anchor is the total and whether it is ready to send.
 * A supplier's minimum appears only when it is not met, beside the products
 * that would close the gap; the send button, when something is missing, takes
 * the carpenter to it instead of sitting there grey.
 */
export default function OrderView({ profile }: { profile: { address: string; city: string; hasContact: boolean } | null }) {
  const cart = useCart()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [address, setAddress] = useState(profile?.address ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [editAddress, setEditAddress] = useState(!profile?.address)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [sheet, setSheet] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<SentOrder[] | null>(null)

  const idsKey = cart.items.map((item) => item.id).sort().join(',')
  useEffect(() => {
    if (!idsKey || !profile) return
    let live = true
    fetch('/api/app/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsKey.split(',') }) })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Quote | null) => {
        if (live && data) setQuote(data)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [idsKey, profile])

  if (!profile) {
    return (
      <div className="mt-6 rounded-2xl border-[1.5px] border-dashed border-[#D9CFC1] p-5 text-[15px] text-muted">
        <b className="mb-1 block text-ink">ההזמנה שייכת לנגרייה מחוברת</b>
        כדי לשלוח הזמנה, נכנסים מקישור הכניסה של הנגרייה.
        <div className="mt-3">
          <Link href="/join" className="inline-flex h-11 items-center rounded-[11px] bg-brand px-4 font-bold text-navy">
            כניסה / הרשמה
          </Link>
        </div>
      </div>
    )
  }

  if (sent) return <Sent orders={sent} />

  if (cart.items.length === 0) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-1">
        <h1 className="m-0 text-2xl font-extrabold">הזמנה חדשה</h1>
        <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
          <b className="block text-ink">ההזמנה ריקה</b>
          מוסיפים מוצרים מהקטלוג או מ&quot;הזמן שוב&quot; — והם מתקבצים כאן לפי ספק.
        </div>
        <div className="flex gap-2">
          <Link href="/app/catalog" className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-brand font-bold text-navy">
            <LayoutGrid size={18} /> לקטלוג
          </Link>
          <Link href="/app/catalog?focus=search" className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
            <Search size={18} /> חיפוש
          </Link>
        </div>
      </div>
    )
  }

  const lines: Line[] = cart.items.map((item) => {
    const product = quote?.products.find((p) => p.id === item.id) ?? null
    const offer = product ? product.offers.find((o) => o.supplierId === item.supplier_id) ?? suggestedOffer(product) : null
    const price = offer?.price ?? item.base_price_excl_vat
    return { item, product, offer, price, step: stepOf(offer ?? { packQty: item.pack_qty ?? null }), total: price * item.quantity }
  })

  const groupMap = new Map<string, Group>()
  for (const line of lines) {
    const supplierId = line.offer?.supplierId ?? line.item.supplier_id ?? ''
    const group = groupMap.get(supplierId) ?? {
      supplierId,
      name: line.offer?.supplierName ?? line.item.supplier_name ?? 'ספק',
      terms: line.offer?.terms ?? [],
      leadDays: line.offer?.leadDays ?? null,
      min: line.offer?.minOrder ?? 0,
      total: 0,
      short: 0,
      lines: [],
    }
    group.lines.push(line)
    group.total += line.total
    groupMap.set(supplierId, group)
  }
  const groups = [...groupMap.values()].map((g) => ({ ...g, short: g.min ? Math.max(0, g.min - g.total) : 0 }))
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const shortGroups = groups.filter((g) => g.short > 0)
  const firstShort = shortGroups[0]

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address || null,
          city: city || null,
          notes: note || null,
          items: lines.map((line) => ({
            id: line.item.id,
            name_he: line.item.name_he,
            base_price_excl_vat: line.price,
            quantity: line.item.quantity,
            supplier_id: line.offer?.supplierId ?? line.item.supplier_id,
          })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'שליחת ההזמנה נכשלה')
      cart.clearCart()
      setSent(result.orders)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחת ההזמנה נכשלה')
    } finally {
      setSending(false)
    }
  }

  const scrollTo = (supplierId: string) => document.getElementById(`group-${supplierId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const sendButton = firstShort ? (
    <button type="button" onClick={() => scrollTo(firstShort.supplierId)} className="flex h-12 w-full items-center justify-center rounded-[11px] border-[1.5px] border-brand-line bg-brand-soft px-3 font-bold text-[#5B3A07]">
      <span>
        השלם <span className="tnum">{money(firstShort.short)}</span> אצל {firstShort.name}
      </span>
    </button>
  ) : (
    <button type="button" onClick={send} disabled={sending || !quote || !address} className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand px-3 font-bold text-navy hover:bg-brand-hover disabled:opacity-60">
      {sending ? 'שולח…' : groups.length > 1 ? `שליחת ${groups.length} הזמנות רכש` : 'שליחת הזמנת רכש'}
    </button>
  )

  const sheetProduct = sheet ? quote?.products.find((p) => p.id === sheet) ?? null : null
  const sheetLine = sheet ? lines.find((line) => line.item.id === sheet) : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-28 pt-1 md:pb-0">
      <section>
        <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">ההזמנה שלך</h1>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <b className="tnum text-[28px] font-extrabold leading-tight">{money(total)}</b>
          <span className="text-sm text-muted">
            לפני מע״מ · <span className="tnum">{cart.items.length}</span> פריטים · {groups.length === 1 ? 'ספק אחד' : `${groups.length} ספקים`}
          </span>
        </div>
        <AttentionLine count={shortGroups.length} calmText={groups.length > 1 ? `מוכנה לשליחה · ${groups.length} הזמנות רכש, אחת לכל ספק` : 'מוכנה לשליחה'}>
          {shortGroups.length === 1 ? (
            <>
              לפני שליחה: חסר <span className="tnum">{money(firstShort!.short)}</span> למינימום אצל {firstShort!.name}
            </>
          ) : (
            'ספקים עוד לא הגיעו למינימום ההזמנה'
          )}
        </AttentionLine>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {groups.map((group) => (
            <section key={group.supplierId} id={`group-${group.supplierId}`} className="scroll-mt-20 overflow-hidden rounded-2xl border border-hair bg-white">
              <div className="grid gap-0.5 border-b border-hair bg-[#FBF9F6] px-3.5 py-3">
                <div className="flex items-baseline gap-2">
                  <b className="text-base">{group.name}</b>
                  <span className="tnum ms-auto font-bold">{money(group.total)}</span>
                </div>
                <div className="text-[13px] text-muted">
                  {termsText(group.terms)}
                  {group.leadDays != null ? ` · עד ${group.leadDays} ימי עסקים` : ''}
                </div>
                {group.short > 0 && (
                  <div className="mt-1.5 grid gap-1 text-[13.5px] text-attn">
                    <div className="h-1.5 overflow-hidden rounded-md bg-[#EFE9E0]">
                      <i className="block h-full rounded-md bg-brand" style={{ width: `${Math.round((group.total / group.min) * 100)}%` }} />
                    </div>
                    <span>
                      חסר <b className="tnum">{money(group.short)}</b> למינימום של <span className="tnum">{money(group.min)}</span>
                    </span>
                  </div>
                )}
              </div>

              {group.lines.map((line) => {
                const packs = Math.round(line.item.quantity / line.step)
                const unit = line.product?.unit ?? line.item.unit ?? 'יח׳'
                return (
                  <div key={line.item.id} className="grid grid-cols-[42px_minmax(0,1fr)] gap-2.5 border-t border-hair px-3.5 py-3 first:border-t-0">
                    <span className="grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-wood-soft text-[#7A5A3A]">
                      <CategoryGlyph icon={line.product?.icon} size={20} />
                    </span>
                    <div className="grid min-w-0 gap-px">
                      <div className="flex items-baseline gap-2">
                        <Link href={`/app/product/${line.item.id}`} className="font-bold leading-snug">
                          {line.item.name_he}
                        </Link>
                        <span className="tnum ms-auto whitespace-nowrap font-bold">{money(line.total)}</span>
                      </div>
                      <div className="text-[13px] text-muted">
                        {packText(line.offer?.packLabel ?? line.item.pack_label ?? null, line.offer?.packQty ?? line.item.pack_qty ?? null, unit) ?? unit} ·{' '}
                        <span className="tnum">{money(line.price)}</span> ל{unit}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                        <Stepper value={packs} min={1} small label={line.item.name_he} onChange={(n) => cart.updateQuantity(line.item.id, Math.max(1, n) * line.step)} />
                        {line.product && line.product.offers.length > 1 && (
                          <button type="button" onClick={() => setSheet(line.item.id)} className="text-sm font-semibold text-brand-ink">
                            החלף ספק
                          </button>
                        )}
                        <button type="button" onClick={() => cart.removeItem(line.item.id)} aria-label={`הסר ${line.item.name_he}`} className="ms-auto grid place-items-center rounded-lg p-1.5 text-faint hover:bg-red-50 hover:text-red-700">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {group.short > 0 && (quote?.suggestions[group.supplierId]?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto border-t border-dashed border-brand-line bg-[#FFFBF4] px-3.5 py-2.5">
                  <span className="whitespace-nowrap text-[13px] font-bold text-attn">להשלמה מ{group.name}:</span>
                  {quote!.suggestions[group.supplierId].map((product) => {
                    const offer = product.offers.find((o) => o.supplierId === group.supplierId)!
                    const step = stepOf(offer)
                    return (
                      <span key={product.id} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-hair bg-white px-2 py-1.5 text-[13.5px]">
                        <span>{product.name}</span>
                        <span className="tnum">{money((offer.price ?? 0) * step)}</span>
                        <button
                          type="button"
                          aria-label={`הוסף ${product.name}`}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-navy"
                          onClick={() =>
                            cart.addItem(
                              {
                                id: product.id,
                                name_he: product.name,
                                name_en: '',
                                base_price_excl_vat: offer.price ?? 0,
                                supplier_id: offer.supplierId,
                                supplier_name: offer.supplierName,
                                unit: product.unit,
                                pack_label: offer.packLabel,
                                pack_qty: offer.packQty,
                              },
                              step
                            )
                          }
                        >
                          <Plus size={15} strokeWidth={2.4} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </section>
          ))}

          <section className="overflow-hidden rounded-2xl border border-hair bg-white">
            <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-3">
              <Truck size={18} className="text-muted" />
              <span className="grid min-w-0 leading-snug">
                <small className="text-[12.5px] text-muted">אספקה ל</small>
                {editAddress ? (
                  <span className="mt-1 grid gap-1.5">
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="רחוב ומספר, אזור תעשייה" aria-label="כתובת" className="rounded-[9px] border-[1.5px] border-hair px-2.5 py-2 text-[15px]" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="עיר" aria-label="עיר" className="rounded-[9px] border-[1.5px] border-hair px-2.5 py-2 text-[15px]" />
                  </span>
                ) : (
                  <b className="text-[15px]">{[address, city].filter(Boolean).join(', ')}</b>
                )}
              </span>
              <button type="button" onClick={() => setEditAddress((v) => !v)} disabled={editAddress && !address} className="text-sm font-semibold text-brand-ink disabled:opacity-40">
                {editAddress ? 'סיום' : 'שינוי'}
              </button>
            </div>
            <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-hair px-3.5 py-3">
              <FileText size={18} className="text-muted" />
              {showNote ? (
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={600} placeholder="לדוגמה: לתאם הגעה לפני 10:00" aria-label="הערה לספקים" className="rounded-[9px] border-[1.5px] border-hair px-2.5 py-2 text-[15px]" />
              ) : (
                <span className="text-muted">{note || 'הערה לספקים'}</span>
              )}
              <button type="button" onClick={() => setShowNote((v) => !v)} className="text-sm font-semibold text-brand-ink">
                {showNote ? 'הסתר' : note ? 'עריכה' : 'הוספה'}
              </button>
            </div>
          </section>
        </div>

        <aside className="grid gap-2.5 rounded-2xl border border-hair bg-white p-3.5 md:sticky md:top-[90px]">
          <div className="grid gap-1.5 text-[15px]">
            <div className="flex justify-between">
              <span>סה״כ לפני מע״מ</span>
              <b className="tnum">{money(total)}</b>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>מע״מ {Math.round(VAT_RATE * 100)}% (להמחשה)</span>
              <span className="tnum">{money(total * VAT_RATE)}</span>
            </div>
            <div className="mt-0.5 flex justify-between border-t border-hair pt-2 text-[17px] font-extrabold">
              <span>סה״כ משוער</span>
              <span className="tnum">{money(total * (1 + VAT_RATE))}</span>
            </div>
          </div>
          <p className="m-0 flex items-start gap-2 text-[13.5px] text-muted">
            <Info size={16} className="mt-0.5 shrink-0 text-navy" />
            אין תשלום באתר. כל ספק מאשר, מספק ומוציא לך חשבונית לפי התנאים שלו.
          </p>
          {!profile.hasContact && <p className="m-0 text-[13.5px] text-attn">חסרים טלפון או מייל בפרטי הנגרייה — אפשר להשלים באזור האישי.</p>}
          {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
          <div className="hidden md:block">{sendButton}</div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[72px] z-30 flex items-center gap-2.5 border-t border-hair bg-white/[.98] px-4 py-2.5 shadow-[0_-6px_16px_rgba(30,42,59,.06)] md:hidden">
        <div className="grid leading-tight">
          <b className="tnum text-[17px]">{money(total)}</b>
          <small className="text-[12.5px] text-muted">לפני מע״מ</small>
        </div>
        <div className="min-w-0 flex-1">{sendButton}</div>
      </div>

      {sheetProduct && sheetLine && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,20,28,.42)] md:items-center" onClick={() => setSheet(null)}>
          <div role="dialog" aria-modal="true" aria-label="בחירת ספק" className="max-h-[88%] w-full overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-3 md:w-[540px] md:rounded-[18px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[19px] font-bold">בחירת ספק</h3>
              <button type="button" onClick={() => setSheet(null)} aria-label="סגירה" className="grid h-9 w-9 place-items-center rounded-full text-muted">
                <X size={20} />
              </button>
            </div>
            <p className="m-0 text-sm text-muted">{sheetProduct.name} · במלאי קודם, ואז המחיר הנמוך ל{sheetProduct.unit}</p>
            <div className="mt-3 grid gap-2.5">
              {sortedOffers(sheetProduct).map((o) => {
                const chosen = o.supplierId === sheetLine.offer?.supplierId
                return (
                  <button
                    key={o.supplierId}
                    type="button"
                    disabled={!o.inStock}
                    aria-pressed={chosen}
                    onClick={() => {
                      cart.switchSupplier(sheetProduct.id, {
                        supplier_id: o.supplierId,
                        supplier_name: o.supplierName,
                        base_price_excl_vat: o.price ?? 0,
                        pack_label: o.packLabel,
                        pack_qty: o.packQty,
                      })
                      setSheet(null)
                    }}
                    className={`grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border-[1.5px] bg-white p-3 text-start disabled:opacity-55 ${chosen ? 'border-navy' : 'border-hair'}`}
                  >
                    <span className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 text-white ${chosen ? 'border-navy bg-navy' : 'border-[#CBD2DA]'}`}>{chosen && <Check size={13} strokeWidth={3} />}</span>
                    <span className="grid min-w-0 leading-snug">
                      <b>{o.supplierName}</b>
                      <small className="text-[12.5px] text-muted">
                        {packText(o.packLabel, o.packQty, sheetProduct.unit) ?? sheetProduct.unit}
                        {o.leadDays != null ? ` · עד ${o.leadDays} ימים` : ''} · {termsText(o.terms)}
                      </small>
                    </span>
                    <span className="grid justify-items-end leading-tight">
                      <b className="tnum text-lg font-extrabold">{o.price != null ? money(o.price) : '—'}</b>
                      <small className="text-xs text-muted">{o.inStock ? `ל${sheetProduct.unit}` : 'אזל'}</small>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 mb-0 text-[13.5px] text-muted">השורה תעבור לספק שבחרת, במחיר שלו.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Sent({ orders }: { orders: SentOrder[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-2">
      <div className="grid justify-items-center gap-2 text-center">
        <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-ok-soft text-ok">
          <Check size={32} strokeWidth={2.4} />
        </span>
        <h1 className="m-0 text-2xl font-extrabold">{orders.length > 1 ? `נשלחו ${orders.length} הזמנות רכש` : 'הזמנת הרכש נשלחה'}</h1>
        <p className="m-0 max-w-[40ch] text-muted">כל ספק קיבל במייל את ההזמנה שלו. כשהספק יאשר — תקבל מייל, וזה יופיע כאן.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {orders.map((order) => (
          <Link key={order.id} href={`/app/orders/${order.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-hair px-3.5 py-3 first:border-t-0">
            <span className="grid leading-tight">
              <b className="tnum">#{order.shortNumber}</b>
              <small className="text-[12.5px] text-muted">{order.supplierName}</small>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-brand" />
              ממתינה לאישור
            </span>
            <span className="tnum font-bold">{money(order.subtotalExclVat)}</span>
          </Link>
        ))}
      </div>
      <div className="flex gap-2">
        <Link href="/app/orders" className="inline-flex h-12 flex-1 items-center justify-center rounded-[11px] bg-brand font-bold text-navy">
          למרכז ההזמנות
        </Link>
        <Link href="/app" className="inline-flex h-12 flex-1 items-center justify-center rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
          לבית
        </Link>
      </div>
    </div>
  )
}
