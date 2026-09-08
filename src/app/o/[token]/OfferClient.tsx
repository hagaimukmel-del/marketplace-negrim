'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, ClipboardList, ArrowRight } from 'lucide-react'
import { rememberCarpenter } from '@/lib/carpenter-session'
import type { OfferProduct } from '@/lib/offer'
import { formatIls, round2, vatAmount, withVat, VAT_RATE } from '@/lib/vat'

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
        className={`flex shrink-0 items-center justify-center rounded-lg bg-stone-200 text-stone-500 ${fallbackSize}`}
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
      className={`shrink-0 rounded-lg bg-stone-100 object-cover ${size}`}
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
    <div
      className={`flex gap-3 border-b border-stone-200 p-4 last:border-b-0 ${
        isFeatured ? 'flex-col sm:flex-row' : ''
      }`}
    >
      <ProductImage product={product} featured={isFeatured} />

      <div className="min-w-0 flex-1">
        <p className={`font-bold text-stone-900 ${isFeatured ? 'text-lg' : 'text-base'}`}>
          {product.name_he}
        </p>
        {product.name_en && <p className="text-sm text-stone-500">{product.name_en}</p>}
        {isFeatured && product.description_he && (
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{product.description_he}</p>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xl font-bold text-stone-900 tabular-nums">{formatIls(unit)}</span>
          <span className="text-xs text-stone-500">ליח׳ ללא מע״מ</span>
          {discounted && (
            <span className="text-sm text-stone-400 line-through tabular-nums">
              {formatIls(product.base_price_excl_vat)}
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 tabular-nums">
          {formatIls(withVat(unit))} כולל מע״מ
        </p>

        {nextTier && (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
            מ־{nextTier.min_qty} יח׳ המחיר יורד ל־{formatIls(nextTier.unit_price_excl_vat)}
          </p>
        )}

        {/* Big tap targets: this is read in a workshop, one-handed. */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(product.id, qty - 1)}
            disabled={qty === 0}
            aria-label="הפחת כמות"
            className="h-11 w-11 rounded-lg border border-stone-300 text-xl font-bold text-stone-700 disabled:opacity-30"
          >
            −
          </button>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => onChange(product.id, parseInt(e.target.value, 10) || 0)}
            aria-label={`כמות עבור ${product.name_he}`}
            className="h-11 w-16 rounded-lg border border-stone-300 text-center text-lg font-semibold tabular-nums"
          />
          <button
            type="button"
            onClick={() => onChange(product.id, qty + 1)}
            aria-label="הוסף כמות"
            className="h-11 w-11 rounded-lg border border-stone-300 text-xl font-bold text-stone-700"
          >
            +
          </button>
          {qty > 0 && (
            <span className="ms-auto text-base font-bold text-emerald-700 tabular-nums">
              {formatIls(round2(unit * qty))}
            </span>
          )}
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
  // Keep the identity for the rest of the visit, so an order placed from the
  // catalogue is still attributed to this carpenter.
  useEffect(() => {
    rememberCarpenter(token)
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
    return (
      <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <p className="text-5xl">📩</p>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">ההזמנה נשלחה</h1>
          <p className="mt-2 font-mono text-sm text-stone-500">{sentOrder}</p>
          <p className="mt-5 text-stone-700">
            העברנו את ההזמנה לספק. הוא יאשר אותה, יספק, ויוציא לך חשבונית ישירות.
          </p>
          <p className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-600">
            זו הזמנת רכש — לא חשבונית. הסכום המחייב הוא זה שיופיע בחשבונית של הספק.
          </p>

          {/* This screen used to end the visit: no links, nothing to do next. */}
          <div className="mt-6 grid gap-2">
            <Link
              href="/carpenter/orders"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 font-semibold text-white"
            >
              <ClipboardList size={17} />
              ההזמנות שלי
            </Link>
            <Link
              href="/carpenter/catalog"
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-stone-300 font-semibold text-stone-700"
            >
              <LayoutGrid size={17} />
              המשך לקטלוג המלא
            </Link>
            <button
              type="button"
              onClick={() => setSentOrder(null)}
              className="flex h-11 items-center justify-center gap-2 text-sm font-medium text-stone-500"
            >
              <ArrowRight size={15} />
              חזרה למבצע
            </button>
          </div>
        </div>
      </main>
    )
  }

  const secondary = reorder.length > 0 ? reorder : suggestions
  const secondaryTitle = reorder.length > 0 ? 'מה שהזמנת בפעם שעברה' : 'עוד מהקטלוג'

  return (
    <main dir="rtl" className="min-h-screen bg-stone-50 pb-40">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-5">
          <p className="text-sm text-stone-500">שוק הנגרים</p>
          <h1 className="text-xl font-bold text-stone-900">{carpenterName}</h1>
        </header>

        {featured && (
          <section className="mb-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 bg-stone-900 px-4 py-3">
              <p className="text-base font-bold text-white">
                {headline ?? (kind === 'discount' ? 'מבצע השבוע' : 'מוצר שאולי לא הכרת')}
              </p>
              {body && <p className="mt-1 text-sm leading-relaxed text-stone-300">{body}</p>}
            </div>
            <ProductRow
              product={featured}
              qty={quantities[featured.id] ?? 0}
              onChange={setQty}
              featured
            />

            <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
              {intentSent ? (
                <p className="text-sm font-medium text-emerald-700">
                  ✓ נרשם. נחזור אליך עם מחיר לכמות שביקשת.
                </p>
              ) : intentOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={intentQty}
                    onChange={(e) => setIntentQty(e.target.value)}
                    placeholder="כמות"
                    aria-label="כמות מבוקשת"
                    className="h-11 w-24 rounded-lg border border-stone-300 px-3 text-center tabular-nums"
                  />
                  <input
                    value={intentNote}
                    onChange={(e) => setIntentNote(e.target.value)}
                    placeholder="הערה (לא חובה)"
                    aria-label="הערה"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 px-3"
                  />
                  <button
                    type="button"
                    onClick={sendIntent}
                    className="h-11 rounded-lg bg-stone-900 px-4 font-semibold text-white"
                  >
                    שלח
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIntentOpen(true)}
                  className="text-sm font-semibold text-stone-700 underline underline-offset-4"
                >
                  צריך כמות גדולה יותר? בקש הצעת מחיר
                </button>
              )}
            </div>
          </section>
        )}

        {secondary.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <h2 className="border-b border-stone-200 px-4 py-3 text-base font-bold text-stone-900">
              {secondaryTitle}
            </h2>
            {secondary.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                qty={quantities[product.id] ?? 0}
                onChange={setQty}
              />
            ))}
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {/* The campaign product and the reorder list are not the whole shop.
            Someone who came for one thing and remembered another needs a way
            through to everything. */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            href="/carpenter/catalog"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white font-semibold text-stone-800"
          >
            <LayoutGrid size={17} />
            כל הקטלוג
          </Link>
          <Link
            href="/carpenter/orders"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white font-semibold text-stone-800"
          >
            <ClipboardList size={17} />
            ההזמנות שלי
          </Link>
        </div>
      </div>

      {/* Sticky basket: the order is never more than one tap away. */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-stone-600">
                {lines.length} פריטים · ללא מע״מ
              </span>
              <span className="text-2xl font-bold text-stone-900 tabular-nums">
                {formatIls(subtotal)}
              </span>
            </div>
            <p className="mb-3 text-xs text-stone-500 tabular-nums">
              מע״מ {(VAT_RATE * 100).toFixed(0)}%: {formatIls(vatAmount(subtotal))} · סה״כ{' '}
              {formatIls(withVat(subtotal))}
            </p>
            <button
              type="button"
              onClick={sendOrder}
              disabled={sending}
              className="h-14 w-full rounded-xl bg-emerald-700 text-lg font-bold text-white disabled:opacity-60"
            >
              {sending ? 'שולח…' : 'שלח הזמנה'}
            </button>
            <p className="mt-2 text-center text-xs text-stone-500">
              הספק יאשר, יספק, ויוציא חשבונית ישירות. אין תשלום כאן.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
