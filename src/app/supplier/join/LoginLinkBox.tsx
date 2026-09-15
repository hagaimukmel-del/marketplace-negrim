'use client'

import { useState, useSyncExternalStore } from 'react'
import { KeyRound } from 'lucide-react'

/**
 * The way back in for a supplier who already registered.
 *
 * There is no password to type, so "log in" means asking for the entry link to
 * be mailed to the address on file. The page answers the same whether or not the
 * address is known, so it cannot be used to list who the suppliers are.
 */
export default function LoginLinkBox() {
  // Set by /supplier/enter when a link was unknown or not yet approved. Read
  // after hydration, since the server render has no window.
  const invalidLink = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('link') === 'invalid',
    () => false
  )

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/supplier/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
        כבר רשומים כספק?
      </h2>

      {invalidLink && (
        <p className="mt-2 rounded-lg bg-amber-100 p-2.5 text-sm text-amber-900">
          הקישור שפתחתם אינו תקף. בקשו קישור חדש למייל.
        </p>
      )}

      <p className="mt-1 text-sm text-emerald-900">
        אין סיסמה — נשלח קישור כניסה למייל שרשום אצלנו.
      </p>

      <form onSubmit={send} className="mt-3 flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          inputMode="email"
          placeholder="המייל שאיתו נרשמתם"
          aria-label="מייל"
          className="h-12 min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3"
        />
        <button
          type="submit"
          disabled={busy || !email}
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
