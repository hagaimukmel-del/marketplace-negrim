'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

const EMPTY = {
  company_name: '',
  business_id: '',
  contact_name: '',
  phone: '',
  email: '',
  city: '',
  sells_note: '',
}

/**
 * A supplier applies here. Unlike the carpenter form, submitting does not grant
 * anything: the operator approves each supplier by hand, so the page ends on a
 * screen that says exactly that rather than pretending an account now exists.
 */
export default function SupplierJoinPage() {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ existing: boolean; message?: string } | null>(null)

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ההרשמה נכשלה')
      setDone({ existing: Boolean(data.existing), message: data.message })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-700" />
          <h1 className="mt-3 text-xl font-bold text-stone-900">
            {done.existing ? 'הבקשה כבר אצלנו' : 'הבקשה נשלחה'}
          </h1>
          <p className="mt-2 text-stone-600">
            {done.message ??
              'נעבור על הפרטים ונחזור אליכם. אחרי האישור תקבלו גישה לטעינת המוצרים והמחירים שלכם.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/carpenter/catalog"
              className="flex h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold text-stone-700"
            >
              לצפייה בקטלוג
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-stone-900">הצטרפות כספק</h1>
        <p className="mt-2 text-stone-600">
          שוק הנגרים מביא אליכם הזמנות מנגריות. אתם מספקים, אתם מוציאים את החשבונית ואתם
          קובעים את תנאי התשלום — אנחנו לא גובים כסף מהנגר.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              שם החברה <span className="text-red-600">*</span>
            </span>
            <input
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              required
              autoFocus
              placeholder="איתמיר בע״מ"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              ח.פ / ע.מ <span className="text-red-600">*</span>
            </span>
            <input
              value={form.business_id}
              onChange={(e) => set('business_id', e.target.value)}
              required
              inputMode="numeric"
              placeholder="512345678"
              className="tnum mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
            <span className="mt-1 block text-xs text-stone-500">
              זו החברה שתוציא את החשבונית לנגר.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              טלפון <span className="text-red-600">*</span>
            </span>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              type="tel"
              inputMode="tel"
              placeholder="050-1234567"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">איש קשר</span>
            <input
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              placeholder="דב"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">מייל</span>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              placeholder="dov@itamir.co.il"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">עיר</span>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="תל אביב"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">מה אתם מוכרים?</span>
            <textarea
              value={form.sells_note}
              onChange={(e) => set('sells_note', e.target.value)}
              rows={3}
              placeholder="דבקים, פרזול, ידיות, מסילות…"
              className="mt-1 w-full rounded-lg border border-stone-300 p-3"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy || !form.company_name || !form.business_id || !form.phone}
            className="h-12 w-full rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'שולח…' : 'שלח בקשה'}
          </button>

          <p className="text-center text-xs text-stone-500">
            כל ספק מאושר ידנית לפני שהמוצרים שלו עולים לקטלוג.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-stone-600">
          נגרייה ולא ספק?{' '}
          <Link href="/join" className="font-semibold text-emerald-700 underline">
            להרשמה כנגרייה
          </Link>
        </p>
      </div>
    </main>
  )
}
