'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatIls } from '@/lib/vat'
import { PROMO_STATUS_LABEL, currentWeek, weekLabel, type PromoWeek } from '@/lib/promo-weeks'

const TONE: Record<PromoWeek['status'], string> = {
  requested: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-stone-100 text-stone-600',
}

function Row({ week, onDone }: { week: PromoWeek; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const now = currentWeek()

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
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[week.status]}`}>
          {week.status === 'approved' && week.weekStart === now ? 'רץ עכשיו' : PROMO_STATUS_LABEL[week.status]}
        </span>
        <span className="min-w-0 flex-1 text-sm text-stone-700">
          <b>{week.productName ?? 'מוצר שנמחק'}</b> · {week.supplierName ?? 'ספק'}
        </span>
        <span className="tnum text-sm text-stone-500">{formatIls(week.price)}</span>
      </div>
      {r && (
        <p className="tnum mt-1 text-sm text-stone-600">
          {r.viewers || r.views} נגריות ראו · {r.adds} הוספות לעגלה · {r.orders} הזמנות
          {r.amount > 0 ? ` · ${formatIls(r.amount)}` : ''}
        </p>
      )}
      {week.status === 'rejected' && week.note && <p className="mt-1 text-sm text-red-700">{week.note}</p>}
      {(week.status === 'requested' || (week.status === 'approved' && week.weekStart > now)) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {week.status === 'requested' && !rejecting && (
            <button
              type="button"
              onClick={() => decide('approve')}
              disabled={busy}
              className="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              לאשר
            </button>
          )}
          {rejecting ? (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="סיבה (הספק יראה אותה)"
                className="h-9 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => decide('reject')}
                disabled={busy}
                className="h-9 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {week.status === 'approved' ? 'לבטל את השבוע' : 'לדחות'}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="h-9 rounded-lg px-3 text-sm text-stone-600">
                חזרה
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="h-9 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700"
            >
              {week.status === 'approved' ? 'לבטל' : 'לדחות'}
            </button>
          )}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      )}
    </li>
  )
}

export default function PromotionsClient({ ready, weeks }: { ready: boolean; weeks: PromoWeek[] }) {
  const router = useRouter()
  const now = currentWeek()
  const waiting = weeks.filter((week) => week.status === 'requested').sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const coming = weeks
    .filter((week) => week.status === 'approved' && week.weekStart >= now)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const past = weeks.filter((week) => week.weekStart < now && week.status !== 'requested')
  const refresh = () => router.refresh()

  const section = (title: string, list: PromoWeek[], empty: string) => (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <h2 className="border-b border-stone-100 px-4 py-3 font-bold text-stone-900">
        {title} <span className="tnum text-sm font-normal text-stone-500">({list.length})</span>
      </h2>
      {list.length ? (
        <ul>
          {list.map((week) => (
            <Row key={week.id} week={week} onDone={refresh} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-500">{empty}</p>
      )}
    </section>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">מוצר השבוע</h1>
        <p className="text-sm text-stone-600">
          ספקים מזמינים שבוע מתוך מסוף הספק. שבוע מאושר מוצג לנגרים עם התווית &quot;מוצר השבוע&quot;. החיוב מחוץ לאתר.
        </p>
      </div>
      {!ready ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          הטבלה עוד לא קיימת בדאטאבייס הזה. צריך להריץ את המיגרציה 20261011130000_promo_weeks.
        </p>
      ) : (
        <>
          {section('מחכים לאישור', waiting, 'אין בקשות שמחכות.')}
          {section('שבועות מאושרים', coming, 'אין שבוע מאושר כרגע.')}
          {section('שבועות שרצו', past, 'עוד לא רץ שבוע.')}
        </>
      )}
    </div>
  )
}
