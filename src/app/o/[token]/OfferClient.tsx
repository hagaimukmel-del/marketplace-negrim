'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ClipboardList, LayoutGrid, Minus, Plus } from 'lucide-react'
import { rememberCarpenter } from '@/lib/carpenter-session'
import type { OfferProduct } from '@/lib/offer'
import { round2, withVat, VAT_RATE } from '@/lib/vat'
import { money } from '@/lib/app/format'

interface Props {
  token: string
  carpenterName: string
  contactName: string | null
  phone: string | null
  email: string | null
  campaignId: string | null
  headline: string | null
  body: string | null
  kind: string | null
  featured: OfferProduct | null
  reorder: OfferProduct[]
  suggestions: OfferProduct[]
}

/**
 * Product image with a designed fallback.
 *
 * Every image_url in the catalogue is currently a Google Drive share link,
 * which does not render when hot-linked, so the naive <img> left a broken tile
 * on every row of the page that is supposed to sell. Until the images are
 * rehosted, a failed load falls back to the product's initials on a neutral
 * tile, which reads as deliberate rather than broken.
 */
function ProductImage({
  product,
  featured,
}: {
  product: OfferProduct
  featured?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const size = featured ? 'h-40 w-full sm:h-28 sm:w-28' : 'h-16 w-16'
  const initials = product.name_he.replace(/[^\p{L}\p{N}]/gu, ' ').trim().slice(0, 3)

  // Google Drive share links do not render when hot-linked from another
  // origin: the request hangs and only then fails, so waiting for onError
  // leaves a broken tile on screen for seconds. Every image_url in the
  // catalogue is currently such a link. Skip the request entirely until the
  // images are rehosted on Supabase Storage.
  const unusable = product.image_url?.includes('drive.google.com') ?? false

  if (!product.image_url || unusable || failed) {
    // A placeholder does not deserve hero height: at 160px tall it pushed the
    // price and the stepper below the fold on a phone.
    const fallbackSize = featured ? 'h-20 w-full sm:h-28 sm:w-28' : 'h-16 w-16'
    return (
      <div
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-[12px] bg-wood-soft text-[#7A5A3A] ${fallbackSize}`}
      >
        <span className={featured ? 'text-2xl font-bold' : 'text-sm font-bold'}>{initials}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt=""
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[12px] bg-wood-soft object-cover ${size}`}
    />
  )
}

/** Unit price after any quantity tier this line has reached. */
function unitPriceFor(product: OfferProduct, quantity: number): number {
  const tier = product.tiers
    .filter((t) => quantity >= t.min_qty && (t.max_qty == null || quantity <= t.max_qty))
    .sort((a, b) => b.min_qty - a.min_qty)[0]
  return tier ? tier.unit_price_excl_vat : product.price_excl_vat
}

/** The next tier this line has not reached yet, for the nudge under the stepper. */
function nextTierFor(product: OfferProduct, quantity: number) {
  return product.tiers
    .filter((t) => t.min_qty > quantity)
    .sort((a, b) => a.min_qty - b.min_qty)[0]
}

function ProductRow({
  product,
  qty,
  onChange,
  featured: isFeatured,
}: {
  product: OfferProduct
  qty: number
  onChange: (id: string, qty: number) => void
  featured?: boolean
}) {
  const unit = unitPriceFor(product, Math.max(qty, 1))
  const nextTier = nextTierFor(product, qty)
  const discounted = unit < product.base_price_excl_vat

  return (
    <div className={`flex gap-3 border-t border-hair p-4 first:border-t-0 ${isFeatured ? 'flex-col sm:flex-row' : ''}`}>
      <ProductImage product={product} featured={isFeatured} />

      <div className="min-w-0 flex-1">
        <p className={`m-0 font-bold ${isFeatured ? 'text-lg' : 'text-base'}`}>{product.name_he}</p>
        {product.name_en && <p className="m-0 text-sm text-muted">{product.name_en}</p>}
        {isFeatured && product.description_he && <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{product.description_he}</p>}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="tnum text-[22px] font-extrabold">{money(unit)}</span>
          <span className="text-[13px] text-muted">ליח׳ לפני מע״מ</span>
          {discounted && <s className="tnum text-sm text-faint">{money(product.base_price_excl_vat)}</s>}
        </div>

        {nextTier && (
          <p className="m-0 mt-2 inline-block rounded-[8px] bg-brand-soft px-2 py-1 text-[13px] font-semibold text-attn">
            מ־{nextTier.min_qty} יח׳ המחיר יורד ל־{money(nextTier.unit_price_excl_vat)}
          </p>
        )}

        {/* Big tap targets: this is read in a workshop, one-handed. */}
        <div className="mt-3 flex items-center gap-2.5">
          <span className="inline-flex items-center overflow-hidden rounded-xl border-[1.5px] border-hair bg-white">
            <button type="button" onClick={() => onChange(product.id, qty + 1)} aria-label="הוסף כמות" className="grid h-11 w-11 place-items-center text-navy">
              <Plus size={18} strokeWidth={2.4} />
            </button>
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => onChange(product.id, parseInt(e.target.value, 10) || 0)}
              aria-label={`כמות עבור ${product.name_he}`}
              className="tnum h-11 w-12 border-x border-hair text-center text-base font-bold"
            />
            <button type="button" onClick={() => onChange(product.id, qty - 1)} disabled={qty === 0} aria-label="הפחת כמות" className="grid h-11 w-11 place-items-center text-navy disabled:opacity-30">
              <Minus size={18} strokeWidth={2.4} />
            </button>
          </span>
          {qty > 0 && <span className="tnum ms-auto text-base font-bold">{money(round2(unit * qty))}</span>}
        </div>
      </div>
    </div>
  )
}

export default function OfferClient({
  token,
  carpenterName,
  contactName,
  phone,
  email,
  campaignId,
  headline,
  body,
  kind,
  featured,
  reorder,
  suggestions,
}: Props) {
  // Two things, and they are not the same thing.
  //
  // localStorage keeps the token for the rest of the visit, so an order placed
  // from the catalogue is still attributed to this carpenter.
  //
  // The exchange below turns that token into a signed cookie the SERVER can
  // check. A token the browser volunteers is a claim; a cookie we minted is
  // proof — and proof is what decides whether a price is rendered at all.
  useEffect(() => {
    rememberCarpenter(token)
    void fetch('/api/carpenter/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {
      // The page still works; this carpenter just keeps seeing the
      // logged-out catalogue until the next time they open their link.
    })
  }, [token])

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [sending, setSending] = useState(false)
  const [sentOrder, setSentOrder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [intentOpen, setIntentOpen] = useState(false)
  const [intentQty, setIntentQty] = useState('')
  const [intentNote, setIntentNote] = useState('')
  const [intentSent, setIntentSent] = useState(false)

  const catalogue = useMemo(() => {
    const all = [featured, ...reorder, ...suggestions].filter(Boolean) as OfferProduct[]
    return new Map(all.map((p) => [p.id, p]))
  }, [featured, reorder, suggestions])

  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const product = catalogue.get(id)!
          const unit = unitPriceFor(product, qty)
          return { product, qty, unit, total: round2(unit * qty) }
        }),
    [quantities, catalogue]
  )

  const subtotal = round2(lines.reduce((sum, line) => sum + line.total, 0))

  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }))
    if (qty > 0 && !(quantities[id] > 0)) {
      void fetch('/api/offer/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, event_type: 'item_added', product_id: id, campaign_id: campaignId }),
      })
    }
  }

  const sendOrder = async () => {
    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          campaign_id: campaignId,
          customer_name: contactName || carpenterName,
          customer_email: email || 'no-email@marketplace-negrim.local',
          customer_phone: phone || '',
          business_name: carpenterName,
          items: lines.map((line) => ({
            id: line.product.id,
            name_he: line.product.name_he,
            name_en: line.product.name_en,
            base_price_excl_vat: line.unit,
            quantity: line.qty,
          })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'שליחת ההזמנה נכשלה')
      setSentOrder(result.orderNumber)
      setQuantities({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת ההזמנה')
    } finally {
      setSending(false)
    }
  }

  const sendIntent = async () => {
    const quantity = parseInt(intentQty, 10)
    if (!featured || !Number.isInteger(quantity) || quantity <= 0) {
      setError('נא להזין כמות')
      return
    }
    try {
      const response = await fetch('/api/offer/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          product_id: featured.id,
          campaign_id: campaignId,
          quantity,
          note: intentNote || null,
        }),
      })
      if (!response.ok) throw new Error('שליחה נכשלה')
      setIntentSent(true)
      setIntentOpen(false)
    } catch {
      setError('לא הצלחנו לשלוח. נסה שוב.')
    }
  }

  // ---------------------------------------------------------------- success
  if (sentOrder) {
    const many = sentOrder.includes(',')
    return (
      <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)] gap-4 pt-4 text-center">
        <span className="mx-auto grid h-[60px] w-[60px] place-items-center rounded-full bg-ok-soft text-ok">
          <Check size={32} strokeWidth={2.4} />
        </span>
        {/* Several numbers mean the cart went to several suppliers, one purchase order each. */}
        <h1 className="m-0 text-2xl font-extrabold">{many ? `נשלחו ${sentOrder.split(',').length} הזמנות רכש` : 'הזמנת הרכש נשלחה'}</h1>
        <p className="tnum m-0 text-sm text-muted">{sentOrder}</p>
        <p className="m-0 text-muted">
          {many
            ? 'כל ספק קיבל את ההזמנה שלו בלבד. כל אחד יאשר, יספק, ויוציא לך חשבונית ישירות.'
            : 'העברנו את ההזמנה לספק. הוא יאשר אותה, יספק, ויוציא לך חשבונית ישירות.'}
        </p>
        <p className="m-0 rounded-[11px] bg-white p-3 text-sm text-muted">זו הזמנת רכש — לא חשבונית. הסכום המחייב הוא זה שיופיע בחשבונית של הספק.</p>
        <div className="grid gap-2">
          <Link href="/app/orders" className="flex h-12 items-center justify-center gap-2 rounded-[11px] bg-brand font-bold text-navy">
            <ClipboardList size={18} /> ההזמנות שלי
          </Link>
          <Link href="/app/catalog" className="flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
            <LayoutGrid size={18} /> לקטלוג המלא
          </Link>
          <button type="button" onClick={() => setSentOrder(null)} className="flex h-11 items-center justify-center gap-2 text-sm font-semibold text-muted">
            <ArrowRight size={15} /> חזרה למבצע
          </button>
        </div>
      </div>
    )
  }

  const secondary = reorder.length > 0 ? reorder : suggestions
  const secondaryTitle = reorder.length > 0 ? 'מה שהזמנת בפעם שעברה' : 'עוד מהקטלוג'

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] gap-5 pt-1 ${lines.length > 0 ? 'pb-44 md:pb-36' : ''}`}>
      <section>
        <div className="text-[15px] font-medium text-muted">הדף האישי שלך</div>
        <h1 className="m-0 mt-0.5 text-[28px] font-extrabold leading-tight text-navy md:text-[34px]">{carpenterName}</h1>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          {featured && (
            <section className="overflow-hidden rounded-2xl border border-hair bg-white shadow-[0_8px_24px_rgba(30,42,59,.06)]">
              <div className="bg-navy px-4 py-3.5 text-white">
                <span className="inline-flex rounded-full bg-brand px-2.5 py-0.5 text-[12.5px] font-bold text-navy">
                  {kind === 'discount' ? 'מבצע' : 'מומלץ'}
                </span>
                <p className="m-0 mt-1.5 text-lg font-bold">{headline ?? (kind === 'discount' ? 'מבצע השבוע' : 'מוצר שאולי לא הכרת')}</p>
                {body && <p className="m-0 mt-1 text-sm leading-relaxed text-slate-300">{body}</p>}
              </div>
              <ProductRow product={featured} qty={quantities[featured.id] ?? 0} onChange={setQty} featured />
              <div className="border-t border-hair bg-warm px-4 py-3">
                {intentSent ? (
                  <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-ok-ink">
                    <Check size={15} strokeWidth={2.6} /> נרשם. נחזור אליך עם מחיר לכמות שביקשת.
                  </p>
                ) : intentOpen ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input inputMode="numeric" value={intentQty} onChange={(e) => setIntentQty(e.target.value)} placeholder="כמות" aria-label="כמות מבוקשת" className="tnum h-11 w-24 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-center" />
                    <input value={intentNote} onChange={(e) => setIntentNote(e.target.value)} placeholder="הערה (לא חובה)" aria-label="הערה" className="h-11 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-hair bg-white px-3" />
                    <button type="button" onClick={sendIntent} className="h-11 rounded-[11px] bg-navy px-4 font-bold text-white">
                      שליחה
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIntentOpen(true)} className="text-sm font-semibold text-brand-ink">
                    צריך כמות גדולה יותר? בקש הצעת מחיר ←
                  </button>
                )}
              </div>
            </section>
          )}

          {secondary.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-bold">{secondaryTitle}</h2>
              <div className="overflow-hidden rounded-2xl border border-hair bg-white">
                {secondary.map((product) => (
                  <ProductRow key={product.id} product={product} qty={quantities[product.id] ?? 0} onChange={setQty} />
                ))}
              </div>
            </section>
          )}

          {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>

        {/* The campaign product and the reorder list are not the whole shop. */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          <Link href="/app/catalog" className="flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
            <LayoutGrid size={18} /> כל הקטלוג
          </Link>
          <Link href="/app/orders" className="flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
            <ClipboardList size={18} /> ההזמנות שלי
          </Link>
        </div>
      </div>

      {/* The order being put together, one tap away — above the bottom navigation. */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-hair bg-white/[.98] px-4 py-3 shadow-[0_-6px_16px_rgba(30,42,59,.06)] md:bottom-0 md:start-[236px]">
          <div className="mx-auto flex max-w-[1060px] flex-wrap items-center gap-x-4 gap-y-2">
            <div className="grid leading-tight">
              <b className="tnum text-xl">{money(subtotal)}</b>
              <small className="tnum text-[12.5px] text-muted">
                {lines.length} פריטים · לפני מע״מ · כולל מע״מ {Math.round(VAT_RATE * 100)}%: {money(withVat(subtotal))}
              </small>
            </div>
            <button type="button" onClick={sendOrder} disabled={sending} className="h-12 min-w-[180px] flex-1 rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover disabled:opacity-60">
              {sending ? 'שולח…' : 'שליחת הזמנה'}
            </button>
            <p className="m-0 w-full text-center text-[12.5px] text-muted md:w-auto">הספק יאשר, יספק ויוציא חשבונית ישירות. אין תשלום כאן.</p>
          </div>
        </div>
      )}
    </div>
  )
}
