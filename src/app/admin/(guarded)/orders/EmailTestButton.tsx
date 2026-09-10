'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

interface TestResult {
  ok?: boolean
  error?: string
  message?: string
  provider?: boolean
  testRecipient?: string | null
  from?: string
  site?: string
}

/**
 * Sends one sample order email so the wording and the confirm button can be
 * judged without placing an order.
 *
 * It reports the configuration back rather than just "sent", because until a
 * domain and a provider key exist the honest answer is "nothing left the
 * server" — and a green tick that means nothing is worse than a clear no.
 */
export default function EmailTestButton() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const send = async () => {
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setResult(await response.json())
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'נכשל' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
      >
        <Mail size={16} />
        {busy ? 'שולח…' : 'שלח מייל בדיקה'}
      </button>

      {result && (
        <div
          className={`rounded-lg p-3 text-sm ${
            result.error
              ? 'bg-red-50 text-red-700'
              : result.provider
                ? 'bg-emerald-50 text-emerald-900'
                : 'bg-amber-50 text-amber-900'
          }`}
        >
          <p className="font-semibold">{result.error ?? result.message}</p>
          {!result.error && (
            <ul className="mt-1.5 space-y-0.5 text-xs">
              <li>ספק שליחה: {result.provider ? 'מחובר' : 'לא מחובר'}</li>
              <li>יעד בדיקות: {result.testRecipient ?? 'לא הוגדר'}</li>
              <li>נשלח מ: {result.from}</li>
              <li>קישורים מצביעים ל: {result.site}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
