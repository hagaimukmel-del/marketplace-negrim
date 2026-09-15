'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { callApi, jsonInit, PAYMENT_TERMS, type SupplierProfile } from '../types'
import type { Notify } from '../SupplierApp'

const INPUT = 'mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3'

/**
 * How this supplier trades: which payment terms they accept, the smallest
 * order worth sending, how long delivery takes, and where to collect from.
 *
 * Payment terms are chips rather than free text, because two suppliers who
 * both mean "30 days from end of month" have to say it the same way before a
 * carpenter can compare them. The supplier sets them and invoices the carpenter
 * directly — nothing is paid through the site.
 */
export default function TermsTab({ profile, notify }: { profile: SupplierProfile; notify: Notify }) {
  const router = useRouter()

  const initial = {
    payment_terms: profile.payment_terms,
    min_order_value_excl_vat:
      profile.min_order_value_excl_vat == null ? '' : String(profile.min_order_value_excl_vat),
    default_lead_time_days:
      profile.default_lead_time_days == null ? '' : String(profile.default_lead_time_days),
    pickup_address: profile.pickup_address ?? '',
  }
  const [form, setForm] = useState(initial)
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = JSON.stringify(form) !== snapshot

  const toggleTerm = (term: string) =>
    setForm((prev) => ({
      ...prev,
      payment_terms: prev.payment_terms.includes(term)
        ? prev.payment_terms.filter((item) => item !== term)
        : [...prev.payment_terms, term],
    }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await callApi('/api/supplier/profile', jsonInit('PATCH', form))
      setSnapshot(JSON.stringify(form))
      notify('התנאים נשמרו')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-bold text-stone-900">תנאי תשלום</h2>
        <p className="mt-0.5 text-sm text-stone-600">
          סמנו את כל התנאים שאתם עובדים בהם. החשבונית יוצאת מכם ישירות לנגר.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAYMENT_TERMS.map((term) => {
            const active = form.payment_terms.includes(term)
            return (
              <button
                key={term}
                type="button"
                onClick={() => toggleTerm(term)}
                aria-pressed={active}
                className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${
                  active
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-stone-300 bg-white text-stone-700'
                }`}
              >
                {active && <Check size={15} />}
                {term}
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">מינימום הזמנה (₪ ללא מע״מ)</span>
          <input
            inputMode="decimal"
            value={form.min_order_value_excl_vat}
            onChange={(e) => setForm((prev) => ({ ...prev, min_order_value_excl_vat: e.target.value }))}
            placeholder="לדוגמה 500"
            className={`tnum ${INPUT}`}
          />
          <span className="mt-1 block text-xs text-stone-500">ריק = אין מינימום.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">זמן אספקה (ימי עבודה)</span>
          <input
            inputMode="numeric"
            value={form.default_lead_time_days}
            onChange={(e) => setForm((prev) => ({ ...prev, default_lead_time_days: e.target.value }))}
            placeholder="לדוגמה 2"
            className={`tnum ${INPUT}`}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">כתובת לאיסוף עצמי</span>
          <input
            value={form.pickup_address}
            onChange={(e) => setForm((prev) => ({ ...prev, pickup_address: e.target.value }))}
            placeholder="רחוב, מספר, עיר — ריק אם אין איסוף"
            className={INPUT}
          />
        </label>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy || !dirty}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:w-auto sm:px-8"
      >
        <Check size={18} />
        {busy ? 'שומר…' : dirty ? 'שמור תנאים' : 'הכל שמור'}
      </button>
    </form>
  )
}
