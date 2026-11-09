'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatIls } from '@/lib/vat'
import { PROMO_STATUS_LABEL, currentWeek, weekLabel, type PromoWeek } from '@/lib/promo-weeks'

export interface PromoSupplierOption {
  id: string
  name: string
  products: { id: string; name: string }[]
}

interface Choices {
  suppliers: PromoSupplierOption[]
  selectableWeeks: string[]
  /** Week start → who holds it, for the weeks that are taken. */
  taken: Map<string, string>
}

const FIELD = 'h-9 min-w-0 rounded-lg border border-stone-300 bg-white px-2 text-base'

async function send(method: 'PUT' | 'PATCH', body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; taken?: boolean }> {
  const response = await fetch('/api/admin/promo', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  return response.ok ? { ok: true } : { ok: false, error: data.error ?? 'הפעולה נכשלה', taken: data.taken === true }
}

function weekOption(week: string, choices: Choices, own?: string) {
  const holder = week === own ? undefined : choices.taken.get(week)
  const now = week === currentWeek() ? ' (השבוע)' : ''
  return (
    <option key={week} value={week}>
      {weekLabel(week)}
      {now}
      {holder ? ` · תפוס: ${holder}` : ''}
    </option>
  )
}

/** Sets a week by hand, at a supplier's request: approved at once, no booking from the supplier needed. */
function ManualForm({ choices, defaultPrice, onDone }: { choices: Choices; defaultPrice: number; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [week, setWeek] = useState(choices.selectableWeeks.find((w) => !choices.taken.has(w)) ?? choices.selectableWeeks[0])
  const [showPrice, setShowPrice] = useState(false)
  const [price, setPrice] = useState(String(defaultPrice))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taken, setTaken] = useState(false)

  const supplier = choices.suppliers.find((item) => item.id === supplierId)

  const submit = async (replace: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const result = await send('PUT', {
        supplier_id: supplierId,
        product_id: productId,
        week_start: week,
        show_price: showPrice,
        price_excl_vat: price,
        note,
        replace,
      })
      if (!result.ok) {
        setTaken(Boolean(result.taken))
        setError(result.error ?? 'הפעולה נכשלה')
        return
      }
      setOpen(false)
      setSupplierId('')
      setProductId('')
      setNote('')
      setTaken(false)
      onDone()
    } catch {
      setError('הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-lg bg-stone-900 px-4 text-base font-semibold text-white"
      >
        להגדיר מוצר שבוע ידנית
      </button>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div>
        <h2 className="font-bold text-stone-900">הגדרה ידנית לפי בקשת ספק</h2>
        <p className="text-base text-stone-600">
          השבוע נשמר כמאושר מיד ומופיע גם במסוף של הספק. אפשר לבחור גם את השבוע הנוכחי.
        </p>
      </div>
      {choices.suppliers.length === 0 ? (
        <p className="text-base text-stone-500">אין ספק מאושר עם מוצר שמוצג לנגרים.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-base text-stone-700">
            ספק
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value)
                setProductId('')
              }}
              className={FIELD}
            >
              <option value="">בחירת ספק</option>
              {choices.suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base text-stone-700">
            מוצר
            <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!supplier} className={FIELD}>
              <option value="">{supplier ? 'בחירת מוצר' : 'קודם בוחרים ספק'}</option>
              {supplier?.products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base text-stone-700">
            שבוע
            <select
              value={week}
              onChange={(e) => {
                setWeek(e.target.value)
                setTaken(false)
                setError(null)
              }}
              className={FIELD}
            >
              {choices.selectableWeeks.map((w) => weekOption(w, choices))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base text-stone-700">
            מחיר השבוע לספק (₪ לפני מע״מ)
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className={`${FIELD} tnum text-end`}
            />
          </label>
          <label className="flex flex-col gap-1 text-base text-stone-700 sm:col-span-2">
            הערה פנימית (לא חובה)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="למשל: ביקש בטלפון"
              className={FIELD}
            />
          </label>
          <label className="flex items-center gap-2 text-base text-stone-700 sm:col-span-2">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="h-4 w-4" />
            להציג את המחיר בכרטיס
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy || !supplierId || !productId}
          className="h-9 rounded-lg bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
        >
          לשמור
        </button>
        {taken && (
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={busy}
            className="h-9 rounded-lg bg-red-700 px-4 text-base font-semibold text-white disabled:opacity-50"
          >
            להחליף את הפרסום הקיים
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-3 text-base text-stone-600">
          סגירה
        </button>
        {error && <span className="text-base text-red-700">{error}</span>}
      </div>
    </section>
  )
}

/** Changes a booking that has not ended: product (of the same supplier), week, price on the card, price of the week. */
function EditForm({ week, choices, onDone, onClose }: { week: PromoWeek; choices: Choices; onDone: () => void; onClose: () => void }) {
  const products = choices.suppliers.find((item) => item.id === week.supplierId)?.products ?? []
  const weeks = choices.selectableWeeks.includes(week.weekStart) ? choices.selectableWeeks : [week.weekStart, ...choices.selectableWeeks]
  const [productId, setProductId] = useState(week.productId)
  const [weekStart, setWeekStart] = useState(week.weekStart)
  const [showPrice, setShowPrice] = useState(week.showPrice)
  const [price, setPrice] = useState(String(week.price))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const body: Record<string, unknown> = { id: week.id }
    if (productId !== week.productId) body.product_id = productId
    if (weekStart !== week.weekStart) body.week_start = weekStart
    if (showPrice !== week.showPrice) body.show_price = showPrice
    if (Number(price) !== week.price) body.price_excl_vat = price
    if (Object.keys(body).length === 1) return onClose()
    setBusy(true)
    setError(null)
    try {
      const result = await send('PATCH', body)
      if (!result.ok) return setError(result.error ?? 'הפעולה נכשלה')
      onClose()
      onDone()
    } catch {
      setError('הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-base text-stone-700">
          מוצר
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={FIELD}>
            {!products.some((item) => item.id === week.productId) && (
              <option value={week.productId}>{week.productName ?? 'המוצר הנוכחי'}</option>
            )}
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-base text-stone-700">
          שבוע
          <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={FIELD}>
            {weeks.map((w) => weekOption(w, choices, week.weekStart))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-base text-stone-700">
          מחיר השבוע לספק (₪ לפני מע״מ)
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            dir="ltr"
            className={`${FIELD} tnum text-end`}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-base text-stone-700">
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="h-4 w-4" />
          להציג את המחיר בכרטיס
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="h-9 rounded-lg bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
        >
          לשמור שינויים
        </button>
        <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-base text-stone-600">
          ביטול
        </button>
        {error && <span className="text-base text-red-700">{error}</span>}
      </div>
    </div>
  )
}

const TONE: Record<PromoWeek['status'], string> = {
  requested: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-stone-100 text-stone-600',
}

function Row({ week, choices, onDone }: { week: PromoWeek; choices: Choices; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const now = currentWeek()

  const [mailed, setMailed] = useState(false)
  const sendSocial = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/promo/social', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'המייל לא נשלח')
      setMailed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המייל לא נשלח')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (action: 'approve' | 'reject') => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: week.id, action, note }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'הפעולה נכשלה')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const r = week.results
  return (
    <li className="border-b border-stone-100 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="tnum w-24 font-semibold text-stone-900">{weekLabel(week.weekStart)}</span>
        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${TONE[week.status]}`}>
          {week.status === 'approved' && week.weekStart === now ? 'רץ עכשיו' : PROMO_STATUS_LABEL[week.status]}
        </span>
        <span className="min-w-0 flex-1 text-base text-stone-700">
          <b>{week.productName ?? 'מוצר שנמחק'}</b> · {week.supplierName ?? 'ספק'}
          <span className="text-stone-500"> · {week.showPrice ? 'עם מחיר' : 'בלי מחיר'}</span>
        </span>
        <span className="tnum text-base text-stone-500">{formatIls(week.price)}</span>
      </div>
      {r && (
        <p className="tnum mt-1 text-base text-stone-600">
          {r.viewers || r.views} נגריות ראו · {r.adds} הוספות לעגלה · {r.orders} הזמנות
          {r.amount > 0 ? ` · ${formatIls(r.amount)}` : ''}
        </p>
      )}
      {week.status === 'rejected' && week.note && <p className="mt-1 text-base text-red-700">{week.note}</p>}
      {editing && <EditForm week={week} choices={choices} onDone={onDone} onClose={() => setEditing(false)} />}
      {!editing && (week.status === 'requested' || week.status === 'approved') && week.weekStart >= now && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {week.status === 'approved' && week.weekStart === now && (
            <button
              type="button"
              onClick={sendSocial}
              disabled={busy || mailed}
              className="h-9 rounded-lg border border-stone-300 px-4 text-base font-semibold text-stone-700 disabled:opacity-50"
            >
              {mailed ? 'המייל לרשתות נשלח' : 'לשלוח עכשיו מייל לרשתות'}
            </button>
          )}
          {!rejecting && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-9 rounded-lg border border-stone-300 px-4 text-base font-semibold text-stone-700"
            >
              לערוך
            </button>
          )}
          {week.status === 'requested' && !rejecting && (
            <button
              type="button"
              onClick={() => decide('approve')}
              disabled={busy}
              className="h-9 rounded-lg bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              לאשר
            </button>
          )}
          {!(week.status === 'approved' && week.weekStart === now) && (rejecting ? (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="סיבה (הספק יראה אותה)"
                className="h-9 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-base"
              />
              <button
                type="button"
                onClick={() => decide('reject')}
                disabled={busy}
                className="h-9 rounded-lg bg-red-700 px-4 text-base font-semibold text-white disabled:opacity-50"
              >
                {week.status === 'approved' ? 'לבטל את השבוע' : 'לדחות'}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="h-9 rounded-lg px-3 text-base text-stone-600">
                חזרה
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="h-9 rounded-lg border border-stone-300 px-4 text-base font-semibold text-stone-700"
            >
              {week.status === 'approved' ? 'לבטל' : 'לדחות'}
            </button>
          ))}
          {error && <span className="text-base text-red-700">{error}</span>}
        </div>
      )}
    </li>
  )
}

export interface CarpenterMailing {
  /** The approved booking running this week; null when there is none. */
  promoId: string | null
  recipients: number
  sent: boolean
}

/** This week's mail to the carpentries that agreed to offers: who gets it, a copy first, and sending it by hand. */
function CarpenterMailingCard({ mailing }: { mailing: CarpenterMailing }) {
  const [busy, setBusy] = useState<'sample' | 'send' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(mailing.sent)

  const run = async (action: 'sample' | 'send') => {
    if (action === 'send' && !window.confirm(`לשלוח עכשיו את מוצר השבוע ל־${mailing.recipients} נגריות?`)) return
    setBusy(action)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/promo/carpenters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'המייל לא נשלח')
      if (action === 'sample') setMessage('דוגמה נשלחה ל־nagarim.b2b@gmail.com')
      else {
        setSent(true)
        setMessage(`נשלח ל־${data.sent} מתוך ${data.queued}. השאר יישלחו בדקות הקרובות.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המייל לא נשלח')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <h2 className="font-bold text-stone-900">מייל לנגריות</h2>
      <p className="mt-1 text-base text-stone-600">
        בכל יום ראשון ב־7:00 מוצר השבוע נשלח במייל לנגריות שהסכימו לקבל מבצעים, עם קישור להסרה. כל שבוע נשלח פעם אחת.
      </p>
      <p className="tnum mt-1 text-base text-stone-800">
        <b>{mailing.recipients}</b> נגריות יקבלו אותו
        {mailing.promoId ? (sent ? ' · השבוע כבר נשלח' : ' · השבוע עוד לא נשלח') : ' · אין השבוע מוצר מאושר'}
      </p>
      {mailing.promoId && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => run('sample')}
            disabled={busy !== null}
            className="h-9 rounded-lg border border-stone-300 px-4 text-base font-semibold text-stone-700 disabled:opacity-50"
          >
            {busy === 'sample' ? 'שולח…' : 'לשלוח לי דוגמה'}
          </button>
          {!sent && (
            <button
              type="button"
              onClick={() => run('send')}
              disabled={busy !== null || mailing.recipients === 0}
              className="h-9 rounded-lg bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              {busy === 'send' ? 'שולח… (כמה דקות)' : 'לשלוח עכשיו לנגריות'}
            </button>
          )}
          {message && <span className="text-base text-emerald-800">{message}</span>}
          {error && <span className="text-base text-red-700">{error}</span>}
        </div>
      )}
    </section>
  )
}

export default function PromotionsClient({
  ready,
  weeks,
  suppliers,
  selectableWeeks,
  defaultPrice,
  mailing,
}: {
  mailing: CarpenterMailing
  ready: boolean
  weeks: PromoWeek[]
  suppliers: PromoSupplierOption[]
  selectableWeeks: string[]
  defaultPrice: number
}) {
  const router = useRouter()
  const now = currentWeek()
  const choices: Choices = {
    suppliers,
    selectableWeeks,
    taken: new Map(
      weeks
        .filter((week) => week.status === 'requested' || week.status === 'approved')
        .map((week) => [week.weekStart, `${week.productName ?? 'מוצר'} · ${week.supplierName ?? 'ספק'}`])
    ),
  }
  const waiting = weeks.filter((week) => week.status === 'requested').sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const coming = weeks
    .filter((week) => week.status === 'approved' && week.weekStart >= now)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const past = weeks.filter((week) => week.weekStart < now && week.status !== 'requested')
  const refresh = () => router.refresh()

  const section = (title: string, list: PromoWeek[], empty: string) => (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <h2 className="border-b border-stone-100 px-4 py-3 font-bold text-stone-900">
        {title} <span className="tnum text-base font-normal text-stone-500">({list.length})</span>
      </h2>
      {list.length ? (
        <ul>
          {list.map((week) => (
            <Row key={week.id} week={week} choices={choices} onDone={refresh} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-base text-stone-500">{empty}</p>
      )}
    </section>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">מוצר השבוע</h1>
        <p className="text-base text-stone-600">
          ספקים מזמינים שבוע מתוך מסוף הספק, ואפשר גם להגדיר או לערוך שבוע ידנית לפי בקשת ספק. שבוע מאושר מוצג לנגרים עם התווית &quot;מוצר השבוע&quot;. בכל יום ראשון ב־7:00 נשלח מייל עם פוסט מוכן לרשתות על המוצר של אותו שבוע, ומייל על המוצר לנגריות שהסכימו לדיוור. החיוב מחוץ לאתר.
        </p>
      </div>
      {!ready ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900">
          הטבלה עוד לא קיימת בדאטאבייס הזה. צריך להריץ את המיגרציה 20261011130000_promo_weeks.
        </p>
      ) : (
        <>
          <CarpenterMailingCard mailing={mailing} />
          <ManualForm choices={choices} defaultPrice={defaultPrice} onDone={refresh} />
          {section('מחכים לאישור', waiting, 'אין בקשות שמחכות.')}
          {section('שבועות מאושרים', coming, 'אין שבוע מאושר כרגע.')}
          {section('שבועות שרצו', past, 'עוד לא רץ שבוע.')}
        </>
      )}
    </div>
  )
}
