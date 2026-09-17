'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import CarpenterLoginBox from './CarpenterLoginBox'

const input = 'mt-1 h-12 w-full rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-base placeholder:text-faint focus:border-navy'

function Field({
  label,
  hint,
  required,
  ...props
}: { label: string; hint?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label} {required && <span className="text-attn">*</span>}
      </span>
      <input {...props} required={required} className={input} />
      {hint && <span className="mt-1 block text-[13px] text-muted">{hint}</span>}
    </label>
  )
}

const BENEFITS = ['מחירי ספקים לנגריות, לפני מע״מ', 'הזמנת רכש ישירות לכל ספק', 'מעקב אחרי כל הזמנה במקום אחד']

/**
 * Registration and login for carpenters. There is no password and no account to
 * manage: the personal link is the account.
 */
export default function JoinClient() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Set when the phone was already registered: the masked address the link went to. */
  const [existing, setExisting] = useState<string | null>(null)

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
          email,
          address,
          city,
          accept_terms: acceptTerms,
          marketing_consent: marketing,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ההרשמה נכשלה')
      if (data.existing) {
        // Already registered: the way in went to their email, not to this page.
        setExisting(data.emailedTo ?? '')
        setBusy(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      // Straight to their own page — the link is the account, so there is
      // nothing to confirm and nothing to log into.
      router.replace(`/o/${data.token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה')
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start md:gap-8">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <section>
          <div className="text-[15px] font-medium text-muted">הצטרפות לנגרימ</div>
          <h1 className="m-0 mt-0.5 text-[28px] font-extrabold leading-tight text-navy text-balance md:text-[34px]">רכש הנגרייה שלך. בשליטה.</h1>
          <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 text-[15px]">
            {BENEFITS.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ok-soft text-ok">
                  <Check size={13} strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        {existing !== null && (
          <div role="status" className="rounded-2xl border border-brand-line bg-brand-soft p-4 text-[#5B3A07]">
            <p className="m-0 font-bold">הנגרייה כבר רשומה אצלנו</p>
            <p className="m-0 mt-1 text-sm">
              {existing
                ? `שלחנו קישור כניסה ל-${existing}. פתחו אותו במכשיר הזה ותהיו מחוברים.`
                : 'אין מייל בפרטי הנגרייה, ולכן לא יכולנו לשלוח קישור. צרו קשר ונעזור.'}
            </p>
          </div>
        )}

        <CarpenterLoginBox />
      </div>

      <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-3.5 rounded-2xl border border-hair bg-white p-4 md:p-5">
        <div>
          <h2 className="m-0 text-lg font-bold">נגרייה חדשה</h2>
          <p className="m-0 mt-0.5 text-sm text-muted">פחות מדקה. אין סיסמה — הקישור האישי הוא החשבון.</p>
        </div>
        <Field label="שם הנגרייה" required autoFocus value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="נגרות כהן ובניו" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2">
          <Field label="טלפון" required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" />
          <Field label="איש קשר" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="דב" />
        </div>
        <Field label="מייל" required type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dov@example.com" hint="לשם יגיעו אישורי הספקים על כל הזמנה." />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Field label="כתובת לאספקה" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="רחוב ומספר, אזור תעשייה" hint="אפשר לשנות בכל הזמנה." />
          <Field label="עיר" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="תל אביב" />
        </div>

        <label className="flex items-start gap-3 rounded-[11px] border border-hair bg-warm p-3">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required className="mt-0.5 h-5 w-5 shrink-0 accent-[#1E2A3B]" />
          <span className="text-sm">
            קראתי ואני מסכים/ה ל
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline">
              תקנון ולמדיניות הפרטיות
            </a>{' '}
            <span className="text-attn">*</span>
          </span>
        </label>
        <label className="flex items-start gap-3 px-3">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1E2A3B]" />
          <span className="text-sm text-muted">אשמח לקבל במייל מבצעים, עדכונים והזמנה להגרלות (לא חובה)</span>
        </label>

        {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <button
          type="submit"
          disabled={busy || !businessName || !phone || !email || !address || !city || !acceptTerms}
          className="h-12 w-full rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? 'רגע…' : 'הצטרפות'}
        </button>
        <p className="m-0 text-center text-[13px] text-muted">
          ספק ולא נגרייה?{' '}
          <Link href="/supplier/join" className="font-semibold text-brand-ink underline">
            להרשמה כספק
          </Link>
        </p>
      </form>
    </div>
  )
}
