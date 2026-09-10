'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Pencil, Phone, MapPin, ArrowRight } from 'lucide-react'
import { formatIls, withVat } from '@/lib/vat'
import type { ConfirmView } from '@/lib/supplier-confirm'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * One screen, one decision.
 *
 * Most confirmations are "yes, all of it", so that is a single button and the
 * amount field stays out of the way behind "יש שינוי". Asking every supplier to
 * retype a number they agree with is how you get typos in the figure the
 * commission is calculated from.
 */
export default function ConfirmClient({ token, view }: { token: string; view: ConfirmView }) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(String(view.submittedTotal))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          confirmed_subtotal_excl_vat: editing ? amount : view.submittedTotal,
          supplier_note: note,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'האישור נכשל')
      setDone(Number(data.confirmed_subtotal_excl_vat))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'האישור נכשל')
    } finally {
      setBusy(false)
    }
  }

  if (done !== null) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
        <CheckCircle2 size={44} className="mx-auto text-emerald-700" />
        <h1 className="mt-3 text-xl font-bold text-stone-900">ההזמנה אושרה</h1>
        <p className="mt-2 text-stone-600">
          אישרת <span className="tnum font-bold">{formatIls(done)}</span> ללא מע״מ עבור הזמנה{' '}
          <span className="tnum font-mono text-sm">{view.orderNumber}</span>.
        </p>
        <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          מכאן זה אצלכם: אספקה וחשבונית ישירות לנגר, לפי התנאים שסיכמתם איתו.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-stone-500">{view.supplierName}</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">הזמנה חדשה</h1>
        <p className="tnum mt-1 text-sm text-stone-500">
          {view.orderNumber} · {formatDate(view.createdAt)}
        </p>
      </div>

      {/* Who it is, and how to reach them — the first thing a supplier checks. */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="font-bold text-stone-900">
          {view.businessName || view.contactName || 'נגרייה'}
        </p>
        {view.contactName && view.businessName && (
          <p className="text-sm text-stone-600">{view.contactName}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {view.phone && (
            <a href={`tel:${view.phone}`} className="flex items-center gap-1.5 text-stone-700">
              <Phone size={14} className="text-stone-400" />
              <span className="tnum">{view.phone}</span>
            </a>
          )}
          {(view.city || view.address) && (
            <span className="flex items-center gap-1.5 text-stone-700">
              <MapPin size={14} className="text-stone-400" />
              {[view.address, view.city].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
        {view.paymentTerms && (
          <p className="mt-2 text-sm text-stone-600">
            תנאי תשלום מבוקשים: <span className="font-semibold">{view.paymentTerms}</span>
          </p>
        )}
        {view.notes && (
          <p className="mt-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{view.notes}</p>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <ul className="space-y-3">
          {view.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-medium text-stone-900">{line.product_name_he}</span>
                <span className="tnum block text-sm text-stone-500">
                  {line.quantity} × {formatIls(line.unit_price_excl_vat)}
                </span>
              </span>
              <span className="tnum shrink-0 font-semibold text-stone-900">
                {formatIls(line.line_total_excl_vat)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-stone-200 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-stone-900">סה״כ ללא מע״מ</span>
            <span className="tnum text-xl font-bold text-stone-900">
              {formatIls(view.submittedTotal)}
            </span>
          </div>
          <p className="tnum mt-0.5 text-end text-xs text-stone-400">
            {formatIls(withVat(view.submittedTotal))} כולל מע״מ
          </p>
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl border border-stone-300 bg-white p-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">הסכום שתספקו בפועל, ללא מע״מ</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
              className="tnum mt-1 h-12 w-full rounded-lg border border-stone-300 px-3 text-lg"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setAmount(String(view.submittedTotal))
            }}
            className="mt-2 flex items-center gap-1.5 text-sm text-stone-500"
          >
            <ArrowRight size={14} />
            חזרה לסכום המקורי
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white p-3 text-sm font-medium text-stone-700"
        >
          <Pencil size={15} />
          יש שינוי בכמות או במחיר
        </button>
      )}

      <label className="block">
        <span className="text-sm font-medium text-stone-700">הערה לנגר (לא חובה)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="אספקה ביום ראשון, פריט אחד חסר במלאי…"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-lg font-bold text-white disabled:opacity-50"
      >
        <Check size={20} />
        {busy ? 'שולח…' : 'אשר הזמנה'}
      </button>

      <p className="text-center text-xs text-stone-500">
        אישור מודיע לנגר שההזמנה בטיפול. האספקה והחשבונית ישירות ממכם אליו, כרגיל.
      </p>
    </div>
  )
}
