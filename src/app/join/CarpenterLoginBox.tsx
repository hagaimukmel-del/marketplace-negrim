'use client'

import { useState, useSyncExternalStore } from 'react'
import { KeyRound } from 'lucide-react'

/**
 * "Already registered?" — for a carpenter on a new device.
 *
 * Registered on the phone, now at the computer: type the email or the phone
 * number, and a login link goes to the email on file. Opening it on this device
 * signs this device in. No password, and nothing is revealed on this page.
 */
export default function CarpenterLoginBox() {
  const invalidLink = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('link') === 'invalid',
    () => false
  )

  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/carpenter/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      setMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="flex items-center gap-2 font-bold text-emerald-950">
        <KeyRound size={17} />
        כבר רשומים? כניסה
      </h2>

      {invalidLink && (
        <p className="mt-2 rounded-lg bg-amber-100 p-2.5 text-sm text-amber-900">
          הקישור שפתחתם אינו תקף. בקשו קישור חדש.
        </p>
      )}

      <p className="mt-1 text-sm text-emerald-900">
        נרשמתם בטלפון ורוצים להיכנס מהמחשב (או להפך)? נשלח קישור כניסה למייל של הנגרייה.
      </p>

      <form onSubmit={send} className="mt-3 flex flex-wrap gap-2">
        <input
          id="carpenter-login-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          placeholder="מייל או טלפון שאיתם נרשמתם"
          aria-label="מייל או טלפון"
          className="h-12 min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3"
        />
        <button
          type="submit"
          disabled={busy || !identifier.trim()}
          className="h-12 shrink-0 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:opacity-50"
        >
          {busy ? 'שולח…' : 'שלחו לי קישור'}
        </button>
      </form>

      {message && <p className="mt-3 text-sm font-semibold text-emerald-900">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
