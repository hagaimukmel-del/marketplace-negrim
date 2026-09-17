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
    <section className="grid gap-2.5 rounded-2xl border border-hair bg-white p-4">
      <h2 className="m-0 flex items-center gap-2 text-base font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-navy-soft text-navy">
          <KeyRound size={17} />
        </span>
        כבר רשומים? כניסה
      </h2>

      {invalidLink && (
        <p role="alert" className="m-0 rounded-[10px] bg-brand-soft p-2.5 text-sm text-attn">
          הקישור שפתחתם אינו תקף. בקשו קישור חדש.
        </p>
      )}

      <p className="m-0 text-sm text-muted">נשלח קישור כניסה למייל של הנגרייה. פותחים אותו במכשיר הזה — וזהו.</p>

      <form onSubmit={send} className="flex flex-wrap gap-2">
        <input
          id="carpenter-login-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          placeholder="מייל או טלפון שאיתם נרשמתם"
          aria-label="מייל או טלפון"
          className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-base placeholder:text-faint focus:border-navy"
        />
        <button type="submit" disabled={busy || !identifier.trim()} className="h-12 shrink-0 rounded-[11px] bg-navy px-5 font-bold text-white disabled:opacity-50">
          {busy ? 'שולח…' : 'שלחו לי קישור'}
        </button>
      </form>

      {message && <p role="status" className="m-0 text-sm font-semibold text-ok-ink">{message}</p>}
      {error && <p role="alert" className="m-0 text-sm text-red-800">{error}</p>}
    </section>
  )
}
