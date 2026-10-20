'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'

const NOTICES: Record<string, string> = {
  'link=invalid': 'הקישור שפתחתם אינו תקף. בקשו קוד חדש.',
  'google=unknown': 'המייל של חשבון הגוגל הזה לא רשום אצלנו. היכנסו עם קוד, או הירשמו למטה.',
  'google=failed': 'הכניסה עם גוגל לא הצליחה. נסו שוב, או היכנסו עם קוד במייל.',
}

/**
 * "Already registered?" — for a carpenter on a new device.
 *
 * Type the email or the phone number, and a six-digit code goes to the email
 * on file; typing it here signs this browser in. The same email has a link
 * too, for opening on another device. No password, and nothing is revealed
 * on this page. With Google configured, a carpentry whose registered email is
 * a Google account can skip the code.
 *
 * `sentTo` opens straight at the code step: /join already mailed one because
 * the details typed into the sign-up form belong to an existing carpentry.
 */
export default function CarpenterLoginBox({ sentTo, googleEnabled = false }: { sentTo?: string; googleEnabled?: boolean }) {
  const notice = useSyncExternalStore(
    () => () => {},
    () => {
      const params = new URLSearchParams(window.location.search)
      const key = Object.keys(NOTICES).find((entry) => {
        const [name, value] = entry.split('=')
        return params.get(name) === value
      })
      return key ? NOTICES[key] : null
    },
    () => null
  )

  const router = useRouter()
  const [identifier, setIdentifier] = useState(sentTo ?? '')
  const [codeSentTo, setCodeSentTo] = useState<string | null>(sentTo ?? null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The sign-up form can mail a code after this box first rendered.
  const [lastSentTo, setLastSentTo] = useState(sentTo)
  if (sentTo !== lastSentTo) {
    setLastSentTo(sentTo)
    if (sentTo) {
      setIdentifier(sentTo)
      setCodeSentTo(sentTo)
      setCode('')
      setMessage(null)
      setError(null)
    }
  }

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault()
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
      setCodeSentTo(identifier.trim())
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
      const response = await fetch('/api/carpenter/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: codeSentTo, code }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'הכניסה נכשלה')
      // The session cookie is set; refresh so every server component reads it.
      router.replace('/app')
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
    <section className="grid gap-2.5 rounded-2xl border border-hair bg-white p-4">
      <h2 className="m-0 flex items-center gap-2 text-base font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-navy-soft text-navy">
          <KeyRound size={17} />
        </span>
        כבר רשומים? כניסה
      </h2>

      {notice && (
        <p role="alert" className="m-0 rounded-[10px] bg-brand-soft p-2.5 text-sm text-attn">
          {notice}
        </p>
      )}

      {codeSentTo === null ? (
        <>
          <p className="m-0 text-sm text-muted">נשלח קוד כניסה למייל של הנגרייה, ומקלידים אותו כאן.</p>
          <form onSubmit={send} className="flex flex-wrap gap-2">
            <input
              id="carpenter-login-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="מייל או טלפון שאיתם נרשמתם"
              aria-label="מייל או טלפון"
              autoComplete="username"
              className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-base placeholder:text-faint focus:border-navy"
            />
            <button type="submit" disabled={busy || !identifier.trim()} className="h-12 shrink-0 rounded-[11px] bg-navy px-5 font-bold text-white disabled:opacity-50">
              {busy ? 'שולח…' : 'שלחו לי קוד'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="m-0 text-sm text-muted">
            {message ?? 'שלחנו קוד כניסה למייל של הנגרייה. הקלידו אותו כאן.'} הקוד מופיע גם בשורת הנושא של המייל.
          </p>
          <form onSubmit={verify} className="flex flex-wrap gap-2">
            <input
              id="carpenter-login-code"
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
              className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-center text-xl font-bold tracking-[0.3em] placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-faint focus:border-navy"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="h-12 shrink-0 rounded-[11px] bg-navy px-5 font-bold text-white disabled:opacity-50">
              {busy ? 'נכנס…' : 'כניסה'}
            </button>
          </form>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button type="button" onClick={() => send()} disabled={busy} className="font-semibold text-navy underline disabled:opacity-50">
              שלחו קוד חדש
            </button>
            <button type="button" onClick={restart} disabled={busy} className="font-semibold text-muted underline disabled:opacity-50">
              מייל או טלפון אחר
            </button>
          </div>
        </>
      )}

      {googleEnabled && (
        <a
          href="/carpenter/google"
          className="flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold text-ink hover:bg-warm"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          כניסה עם גוגל
        </a>
      )}

      {error && <p role="alert" className="m-0 text-sm text-red-800">{error}</p>}
    </section>
  )
}
