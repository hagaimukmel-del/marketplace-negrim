'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/regions'
import { JOB_TYPES } from '@/lib/work'

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
export default function ProfileForm({ initial, existing, boardOpen }: { initial: ProfileValues; existing: boolean; boardOpen: boolean }) {
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
          לשלוח לי במייל עבודות שמתאימות לי (כשההתראות ייפתחו)
        </label>
      </section>

      <section className="rounded-xl border border-[#8CC9C2] bg-[#E2F0EF] p-4 text-sm text-[#0B5A5A]">
        <b className="block text-[15px]">בתקופת ההשקה השירות ללא תשלום.</b>
        אחריה: 470 ₪ לשנה (כ־39.17 ₪ לחודש בממוצע) או 350 ₪ לחצי שנה, לפני מע״מ. תקופה קבועה בלי חידוש אוטומטי. נודיע מראש לפני
        שהתשלום יתחיל.
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
        {busy ? 'שומר…' : existing ? 'שמירה' : 'שמירה והצטרפות'}
      </button>
    </form>
  )
}
