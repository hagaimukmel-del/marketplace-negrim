'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollText } from 'lucide-react'
import {
  BILLING_STARTS_LABEL,
  SUPPLIER_AGREEMENT_MONTHS,
  SUPPLIER_ANNUAL_EXCL_VAT,
  SUPPLIER_MONTHLY_EXCL_VAT,
} from '@/lib/supplier-plans'

/**
 * The gist each side agrees to, above the checkbox. A supplier sees the
 * subscription it commits to: accepting the terms is agreeing to it, so the
 * amount cannot live only on the terms page.
 */
const POINTS: Record<'carpenter' | 'supplier', string[]> = {
  carpenter: [
    'שוק הנגרים מחבר בין נגריות לספקים ואינו צד לעסקה.',
    'הספק מוכר, מספק ומוציא חשבונית. התשלום עובר ישירות אליו.',
    'הזמנה היא הזמנת רכש, ומחייבת אחרי שהספק אישר אותה.',
    'נכנסים בקוד שנשלח למייל או עם Google. לא מעבירים אותם לאחרים.',
  ],
  supplier: [
    'אתם המוכרים: מאשרים הזמנות, מספקים ומוציאים חשבונית לנגרייה. שוק הנגרים אינו צד לעסקה.',
    `מנוי ${SUPPLIER_MONTHLY_EXCL_VAT.toLocaleString('he-IL')} ₪ לחודש לפני מע״מ, בהסכם ל-${SUPPLIER_AGREEMENT_MONTHS} חודשים (${SUPPLIER_ANNUAL_EXCL_VAT.toLocaleString('he-IL')} ₪ לשנה). אין עמלה על הזמנות.`,
    `החיוב מתחיל ב${BILLING_STARTS_LABEL} ונעשה מחוץ לאתר, בחשבונית ישירה.`,
    'פרטי הנגריות משמשים רק לטיפול בהזמנה או בפנייה שהגיעה מהן.',
  ],
}

/**
 * Asks for the current terms before anything else on the page can be used.
 *
 * Shown to someone who is signed in but has not accepted this version — an
 * imported carpenter, a supplier the operator opened by hand, or anyone after
 * the terms change. It cannot be dismissed, only accepted or left: using the
 * site without accepting is exactly what it exists to prevent.
 */
export default function TermsGate({ role }: { role: 'carpenter' | 'supplier' }) {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          ...(role === 'carpenter' ? { marketing_consent: marketing } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'האישור נכשל')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'האישור נכשל')
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    await fetch(role === 'supplier' ? '/api/supplier/session' : '/api/carpenter/session', {
      method: 'DELETE',
    }).catch(() => undefined)
    window.location.href = role === 'supplier' ? '/supplier/join' : '/'
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/60 sm:items-center sm:p-4"
    >
      <div className="w-full rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <ScrollText size={22} />
          </span>
          <h2 id="terms-gate-title" className="text-lg font-bold text-stone-900">
            לפני שממשיכים — תנאי השימוש
          </h2>
        </div>

        <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
          {POINTS[role].map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>

        <label className="mt-4 flex items-start gap-3 rounded-lg border border-stone-200 p-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700"
          />
          <span className="text-sm text-stone-800">
            קראתי ואני מסכים/ה ל
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline">
              תקנון, לתנאי השימוש ולמדיניות הפרטיות
            </a>
            {role === 'supplier' && (
              <>
                {' '}ול
                <a href="/terms/suppliers" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline">
                  נספח הספקים
                </a>
              </>
            )}
          </span>
        </label>

        {role === 'carpenter' && (
          <label className="mt-2 flex items-start gap-3 rounded-lg p-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700"
            />
            <span className="text-sm text-stone-600">
              אשמח לקבל במייל מבצעים, עדכונים והזמנה להגרלות (לא חובה)
            </span>
          </label>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={accept}
          disabled={!agreed || busy}
          className="mt-4 h-12 w-full rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-50"
        >
          {busy ? 'רגע…' : 'אישור והמשך'}
        </button>
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          className="mt-2 h-11 w-full rounded-lg text-sm text-stone-500 hover:bg-stone-50"
        >
          לא עכשיו — יציאה
        </button>
      </div>
    </div>
  )
}
