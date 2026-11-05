'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { safeNext } from '@/lib/notification-links'

/**
 * The way back in for a supplier who already registered, the same way a
 * carpentry signs in.
 *
 * Type the email, and a six-digit code goes to the address on file; typing it
 * here signs this browser in. The same email has the entry link too, for
 * opening on another device. No password, and the page answers the same
 * whether or not the address is known, so it cannot be used to list who the
 * suppliers are.
 */
export default function LoginLinkBox() {
  // Set by /supplier/enter when a link was unknown or not yet approved. Read
  // after hydration, since the server render has no window.
  const invalidLink = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('link') === 'invalid',
    () => false
  )

  // The page the supplier was trying to open (an email link while signed out); both the code and the link return there.
  const next = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('next') ?? '',
    () => ''
  )

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/supplier/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      setCodeSentTo(email.trim())
      setCode('')
      setMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!codeSentTo) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: codeSentTo, code }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'הכניסה נכשלה')
      // The session cookie is set; refresh so every server component reads it.
      router.replace(safeNext(next || null, '/supplier') ?? '/supplier')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הכניסה נכשלה')
      setBusy(false)
    }
  }

  const restart = () => {
    setCodeSentTo(null)
    setCode('')
    setMessage(null)
    setError(null)
  }

  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="flex items-center gap-2 font-bold text-emerald-950">
        <KeyRound size={17} />
        כבר רשומים כספק? כניסה
      </h2>

      {invalidLink && (
        <p className="mt-2 rounded-lg bg-amber-100 p-2.5 text-base text-amber-900">
          הקישור שפתחתם אינו תקף. בקשו קוד חדש למייל.
        </p>
      )}

      {codeSentTo === null ? (
        <>
          <p className="mt-1 text-base text-emerald-900">
            אין סיסמה: נשלח קוד כניסה למייל שרשום אצלנו, ומקלידים אותו כאן.
          </p>

          <form onSubmit={send} className="mt-3 flex flex-wrap gap-2">
            <input
              id="supplier-login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="המייל שאיתו נרשמתם"
              aria-label="מייל"
              className="h-12 min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="h-12 shrink-0 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'שולח…' : 'שלחו לי קוד'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-base text-emerald-900">
            {message ?? 'שלחנו קוד כניסה למייל שרשום אצלנו. הקלידו אותו כאן.'} הקוד מופיע גם בשורת הנושא של המייל.
          </p>

          <form onSubmit={verify} className="mt-3 flex flex-wrap gap-2">
            <input
              id="supplier-login-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              placeholder="קוד בן 6 ספרות"
              aria-label="קוד כניסה"
              dir="ltr"
              className="h-12 min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 text-center text-xl font-bold tracking-[0.3em] placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="h-12 shrink-0 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'נכנס…' : 'כניסה'}
            </button>
          </form>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button type="button" onClick={() => send()} disabled={busy} className="font-semibold text-emerald-800 underline disabled:opacity-50">
              שלחו קוד חדש
            </button>
            <button type="button" onClick={restart} disabled={busy} className="font-semibold text-stone-600 underline disabled:opacity-50">
              מייל אחר
            </button>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 text-base text-red-700">{error}</p>}
    </section>
  )
}
