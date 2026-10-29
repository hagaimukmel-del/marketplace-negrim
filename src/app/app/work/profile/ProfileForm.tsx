'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/regions'
import { JOB_TYPES, WORK_FREE_UNTIL, WORK_PRICES } from '@/lib/work'

export interface ProfileValues {
  jobTypes: string[]
  regions: string[]
  machines: string
  notifyEmail: boolean
}

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key]
}

function Toggles({ options, value, onChange, label }: { options: readonly { key: string; name: string }[]; value: string[]; onChange: (next: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="mt-1.5 flex flex-wrap gap-2">
      {options.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={value.includes(item.key)}
          onClick={() => onChange(toggle(value, item.key))}
          className={`h-10 rounded-full border px-3.5 text-sm font-semibold ${
            value.includes(item.key) ? 'border-[#0E5E5E] bg-[#0E5E5E] text-white' : 'border-hair bg-white text-ink'
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}

/**
 * What the carpentry does and where. Saving it the first time is joining the
 * service; the prices after the launch are stated here so nobody is surprised
 * later, with no payment asked for now.
 */
/**
 * Where the notifications go. They are sent only to an address the carpentry
 * proved it reads: opening the link mailed to it marks it verified.
 */
function EmailStatus({ email, verified }: { email: string | null; verified: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')

  if (!email) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        אין מייל בפרטי הנגרייה, ולכן לא נשלח לכם התראות.{' '}
        <Link href="/app/account" className="font-semibold underline">
          להוספת מייל
        </Link>
      </p>
    )
  }
  if (verified) {
    return (
      <p className="text-sm text-muted">
        ההתראות יישלחו אל <b dir="ltr" className="text-ink">{email}</b> (מאומת). עד 5 מיילים ביום.
      </p>
    )
  }

  const send = async () => {
    setState('busy')
    const response = await fetch('/api/carpenter/login-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ self: true }),
    }).catch(() => null)
    setState(response?.ok ? 'sent' : 'error')
  }

  return (
    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <p className="m-0">
        כדי לקבל התראות צריך לאמת את המייל <b dir="ltr">{email}</b>.
      </p>
      {state === 'sent' ? (
        <p className="m-0 mt-2 font-semibold">שלחנו קישור. פתחו אותו מהמייל, והמייל יאומת.</p>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={state === 'busy'}
          className="mt-2 h-10 rounded-lg border border-amber-300 bg-white px-3 font-semibold text-amber-900 disabled:opacity-50"
        >
          {state === 'busy' ? 'שולח…' : 'שלחו לי קישור לאימות'}
        </button>
      )}
      {state === 'error' && <p className="m-0 mt-2 text-red-700">השליחה נכשלה. נסו שוב בעוד רגע.</p>}
    </div>
  )
}

/**
 * Leaving the service, behind a confirmation. Nothing is deleted: the jobs
 * come off the board, the emails stop, and saving the profile joins again.
 */
function LeaveService() {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leave = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/work/profile', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'היציאה נכשלה')
      router.push('/app/work')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'היציאה נכשלה')
      setBusy(false)
    }
  }

  return (
    <section id="leave" className="rounded-xl border border-hair bg-white p-4 text-sm">
      {asking ? (
        <>
          <b className="block text-[15px] text-ink">לצאת מנגרים עובדים ביחד?</b>
          <p className="mt-1 mb-0 text-muted">
            העבודות הפתוחות שלכם יירדו מהלוח, ולא תקבלו יותר מיילים מהשירות. השיחות והפרופיל נשמרים, ואפשר לחזור בכל רגע בשמירת הפרופיל.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={leave}
              disabled={busy}
              className="h-11 rounded-[11px] bg-red-700 px-4 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'יוצא…' : 'כן, לצאת'}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={busy}
              className="h-11 rounded-[11px] border border-hair bg-white px-4 font-semibold text-ink"
            >
              ביטול
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted">לא רוצים להמשיך בשירות?</span>
          <button type="button" onClick={() => setAsking(true)} className="h-10 rounded-[11px] border border-red-200 bg-white px-3 font-semibold text-red-700">
            יציאה מנגרים עובדים ביחד
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 mb-0 text-red-700">{error}</p>}
    </section>
  )
}

export default function ProfileForm({
  initial,
  member,
  boardOpen,
  email,
  emailVerified,
}: {
  initial: ProfileValues
  /** Joined the service: saving updates the profile, and leaving is offered. */
  member: boolean
  boardOpen: boolean
  email: string | null
  emailVerified: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (form.jobTypes.length === 0) return setError('צריך לבחור לפחות סוג עבודה אחד')
    if (form.regions.length === 0) return setError('צריך לבחור לפחות אזור אחד')
    setBusy(true)
    try {
      const response = await fetch('/api/work/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_types: form.jobTypes,
          regions: form.regions,
          machines: form.machines,
          notify_email: form.notifyEmail,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'השמירה נכשלה')
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-ink">מה הנגרייה שלכם עושה?</h1>
        <p className="mt-1 text-sm text-muted">
          לפי זה נתאים לכם עבודות. הפרופיל לא מתפרסם בלוח, ונגרייה שתפנו אליה תראה אותו.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-hair bg-white p-4">
        <div>
          <span className="text-sm font-medium text-ink">סוגי עבודה <span className="text-red-600">*</span></span>
          <Toggles label="סוגי עבודה" options={JOB_TYPES} value={form.jobTypes} onChange={(jobTypes) => setForm({ ...form, jobTypes })} />
        </div>
        <div>
          <span className="text-sm font-medium text-ink">אזורי עבודה <span className="text-red-600">*</span></span>
          <Toggles label="אזורי עבודה" options={REGIONS} value={form.regions} onChange={(regions) => setForm({ ...form, regions })} />
        </div>
        <label className="block">
          <span className="text-sm font-medium text-ink">מכונות עיקריות</span>
          <input
            value={form.machines}
            onChange={(e) => setForm({ ...form, machines: e.target.value })}
            maxLength={300}
            placeholder="CNC, מכונת קנטים, מסור פאנל, תא צבע"
            className="mt-1 h-12 w-full rounded-[11px] border border-hair bg-white px-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })} className="h-5 w-5" />
          לשלוח לי במייל עבודות שמתאימות לי, פניות לעבודות שלי והודעות חדשות
        </label>
        {form.notifyEmail && <EmailStatus email={email} verified={emailVerified} />}
      </section>

      <section className="rounded-xl border border-[#8CC9C2] bg-[#E2F0EF] p-4 text-sm text-[#0B5A5A]">
        <b className="block text-[15px]">השירות {WORK_FREE_UNTIL}.</b>
        {WORK_PRICES} נודיע מראש לפני שהתשלום יתחיל.
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {boardOpen ? (
            <>
              נשמר.{' '}
              <Link href="/app/work" className="underline">
                ללוח העבודות
              </Link>
            </>
          ) : (
            'נשמר. אתם בין הנגריות המייסדות, ונעדכן כשהלוח ייפתח.'
          )}
        </p>
      )}

      <button type="submit" disabled={busy} className="h-12 rounded-[11px] bg-[#0E5E5E] text-lg font-bold text-white disabled:opacity-50">
        {busy ? 'שומר…' : member ? 'שמירה' : 'שמירה והצטרפות'}
      </button>

      {member && <LeaveService />}
    </form>
  )
}
