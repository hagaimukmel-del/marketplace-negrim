'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Megaphone, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { BILLING_STARTS_LABEL, PROMO_WEEK_EXCL_VAT, SUPPLIER_PLANS, planFor, planLabel } from '@/lib/supplier-plans'
import { PROMO_STATUS_LABEL, bookableWeeks, currentWeek, weekLabel, type PromoWeek } from '@/lib/promo-weeks'
import { callApi, jsonInit, type ProductItem, type SupplierPromo } from '../types'
import type { Notify } from '../SupplierApp'

const STATUS_TONE: Record<PromoWeek['status'], string> = {
  requested: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-stone-100 text-stone-600',
}

function Plan({ products }: { products: ProductItem[] }) {
  const listed = products.filter((product) => product.isActive).length
  const current = planFor(listed)
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-bold text-stone-900">המנוי שלך</h2>
      <p className="mt-0.5 text-base text-stone-600">
        יש לך <span className="tnum font-semibold">{listed}</span> מוצרים מוצגים לנגרים. המנוי נקבע לפי מספר המוצרים,
        בלי עמלה על הזמנות.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {SUPPLIER_PLANS.map((plan, index) => {
          const mine = plan === current
          return (
            <li
              key={index}
              className={`rounded-xl border p-3 ${mine ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' : 'border-stone-200'}`}
            >
              <p className="text-base text-stone-600">{planLabel(index)}</p>
              <p className="tnum mt-0.5 text-lg font-bold text-stone-900">
                {formatIls(plan.monthlyExclVat)}
                <span className="text-sm font-normal text-stone-500"> לחודש, לפני מע״מ</span>
              </p>
              {mine && (
                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-emerald-800">
                  <Check size={14} />
                  המדרגה שלך
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-stone-500">
        החיוב מתחיל ב{BILLING_STARTS_LABEL} ונעשה מחוץ לאתר, בחשבונית ישירה. האתר לא גובה תשלום.
      </p>
    </section>
  )
}

function Results({ week }: { week: PromoWeek }) {
  if (!week.results) return null
  const { viewers, views, adds, orders, amount } = week.results
  return (
    <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
      {[
        ['נגריות ראו', viewers || views],
        ['הוספות לעגלה', adds],
        ['הזמנות', orders],
        ['סכום', amount > 0 ? formatIls(amount) : '—'],
      ].map(([label, value]) => (
        <div key={label as string} className="rounded-lg bg-stone-50 px-1 py-2">
          <dt className="text-xs text-stone-500">{label}</dt>
          <dd className="tnum text-base font-bold text-stone-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * "מנוי ופרסום": the subscription tier this supplier is in, and booking a week
 * of "מוצר השבוע" (T-024).
 *
 * The calendar shows the next weeks as free, taken (by someone, never named)
 * or the supplier's own booking. Picking a free week asks which product; the
 * request then waits for the operator's approval. Weeks that ran show what the
 * slot did: carpentries that saw it, adds to cart, and orders.
 */
export default function PromoTab({
  promo,
  products,
  notify,
}: {
  promo: SupplierPromo
  products: ProductItem[]
  notify: Notify
}) {
  const router = useRouter()
  const [picking, setPicking] = useState<string | null>(null)
  const [productId, setProductId] = useState('')
  const [showPrice, setShowPrice] = useState(false)
  const [busy, setBusy] = useState(false)

  const live = products.filter((product) => product.isActive)
  const now = currentWeek()
  const mine = new Map(
    promo.weeks.filter((week) => week.status === 'requested' || week.status === 'approved').map((week) => [week.weekStart, week])
  )
  const taken = new Set(promo.taken)
  const history = promo.weeks.filter(
    (week) => (week.status === 'approved' && week.weekStart <= now) || week.status === 'rejected'
  )

  const book = async () => {
    if (!picking || !productId) return
    setBusy(true)
    try {
      await callApi('/api/supplier/promo', jsonInit('POST', { week_start: picking, product_id: productId, show_price: showPrice }))
      notify('הבקשה נשלחה לאישור')
      setPicking(null)
      setProductId('')
      setShowPrice(false)
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ההזמנה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  const togglePrice = async (week: PromoWeek) => {
    setBusy(true)
    try {
      await callApi('/api/supplier/promo', jsonInit('PATCH', { id: week.id, show_price: !week.showPrice }))
      notify(week.showPrice ? 'המחיר לא יוצג בפרסומת' : 'המחיר יוצג בפרסומת')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'השינוי נכשל', 'error')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (week: PromoWeek) => {
    setBusy(true)
    try {
      await callApi(`/api/supplier/promo?id=${week.id}`, { method: 'DELETE' })
      notify('הבקשה בוטלה')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'הביטול נכשל', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Plan products={products} />

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-4">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <Megaphone size={18} className="text-emerald-700" />
            מוצר השבוע
          </h2>
          <p className="mt-0.5 text-base text-stone-600">
            מוצר אחד שלך מוצג שבוע שלם בראש דף הבית של כל הנגרים, בראש הקטגוריה שלו, וראשון אצל הסוכן כשמחפשים בתחום.
            הוא מסומן &quot;פרסומת&quot;, ומוצג בלי מחיר אלא אם תבחר להציג אותו.{' '}
            <b className="tnum">{formatIls(PROMO_WEEK_EXCL_VAT)}</b> לשבוע, לפני מע״מ, בחיוב מחוץ לאתר.
          </p>
        </div>

        {!promo.ready ? (
          <p className="border-t border-stone-100 bg-stone-50 p-4 text-base text-stone-600">ההזמנה של שבועות תיפתח בקרוב.</p>
        ) : live.length === 0 ? (
          <p className="border-t border-stone-100 bg-stone-50 p-4 text-base text-stone-600">
            אפשר לקדם רק מוצר שמוצג לנגרים. הוסף מוצר קודם.
          </p>
        ) : (
          <ul className="border-t border-stone-100">
            {bookableWeeks().map((week) => {
              const booking = mine.get(week)
              const isTaken = !booking && taken.has(week)
              return (
                <li key={week} className="border-b border-stone-100 px-4 py-3 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="shrink-0 text-stone-400" />
                    <div className="min-w-0 flex-1">
                      <p className="tnum font-semibold text-stone-900">{weekLabel(week)}</p>
                      {booking && <p className="truncate text-sm text-stone-500">{booking.productName}</p>}
                      {booking && (
                        <button
                          type="button"
                          onClick={() => togglePrice(booking)}
                          disabled={busy}
                          className="mt-0.5 text-sm font-semibold text-emerald-800 underline underline-offset-2"
                        >
                          {booking.showPrice ? 'מחיר מוצג בפרסומת · להסתיר' : 'בלי מחיר בפרסומת · להציג מחיר'}
                        </button>
                      )}
                    </div>
                    {booking ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${STATUS_TONE[booking.status]}`}>
                          {PROMO_STATUS_LABEL[booking.status]}
                        </span>
                        {booking.status === 'requested' && (
                          <button
                            type="button"
                            onClick={() => cancel(booking)}
                            disabled={busy}
                            aria-label={`בטל את הבקשה לשבוע ${weekLabel(week)}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ) : isTaken ? (
                      <span className="shrink-0 text-base text-stone-400">תפוס</span>
                    ) : picking === week ? null : (
                      <button
                        type="button"
                        onClick={() => {
                          setPicking(week)
                          setProductId('')
                          setShowPrice(false)
                        }}
                        className="h-9 shrink-0 rounded-lg border border-emerald-700 px-3 text-base font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        לבחור שבוע
                      </button>
                    )}
                  </div>
                  {picking === week && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <label className="flex items-center gap-2 text-base text-stone-700 sm:col-span-3">
                        <input
                          type="checkbox"
                          checked={showPrice}
                          onChange={(e) => setShowPrice(e.target.checked)}
                          className="h-5 w-5 accent-emerald-700"
                        />
                        להציג את המחיר שלי בפרסומת
                      </label>
                      <select
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        aria-label="איזה מוצר לקדם"
                        className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3"
                      >
                        <option value="">איזה מוצר לקדם?</option>
                        {live.map((product) => (
                          <option key={product.productId} value={product.productId}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={book}
                        disabled={busy || !productId}
                        className="h-12 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500"
                      >
                        {busy ? 'שולח…' : 'שלח לאישור'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPicking(null)}
                        className="h-12 rounded-lg px-4 text-base font-semibold text-stone-600 hover:bg-stone-100"
                      >
                        ביטול
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <h2 className="px-4 pt-4 font-bold text-stone-900">השבועות שלך</h2>
          <ul className="mt-2">
            {history.map((week) => (
              <li key={week.id} className="border-t border-stone-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="tnum font-semibold text-stone-900">{weekLabel(week.weekStart)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${STATUS_TONE[week.status]}`}>
                    {week.weekStart === now && week.status === 'approved' ? 'רץ עכשיו' : PROMO_STATUS_LABEL[week.status]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-end text-base text-stone-600">{week.productName}</span>
                </div>
                {week.status === 'rejected' && week.note && <p className="mt-1 text-base text-red-700">{week.note}</p>}
                <Results week={week} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
