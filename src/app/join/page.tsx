'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName,
          phone,
          city,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ההרשמה נכשלה')
      // Straight to their own page — the link is the account, so there is
      // nothing to confirm and nothing to log into.
      router.replace(`/o/${data.token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה')
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-stone-900">הצטרפות לשוק הנגרים</h1>
        <p className="mt-2 text-stone-600">
          מלא פרטים ותקבל קישור אישי להזמנות. אין סיסמה ואין חשבון לנהל — הקישור הוא
          החשבון שלך, ושומרים אותו במועדפים.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              שם הנגרייה <span className="text-red-600">*</span>
            </span>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              autoFocus
              placeholder="נגרות כהן ובניו"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              טלפון <span className="text-red-600">*</span>
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="דב"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">עיר</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="תל אביב"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy || !businessName || !phone}
            className="h-12 w-full rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'רגע…' : 'קבל קישור אישי'}
          </button>

          <p className="text-center text-xs text-stone-500">
            אם כבר יש לך קישור — הטופס יחזיר לך את אותו אחד, לא ייצור חדש.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-stone-600">
          ספק ולא נגרייה?{' '}
          <Link href="/supplier/join" className="font-semibold text-emerald-700 underline">
            להרשמה כספק
          </Link>
        </p>
      </div>
    </main>
  )
}
