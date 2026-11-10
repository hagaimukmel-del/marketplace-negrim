'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, CalendarDays, ChevronLeft, ChevronRight, Hammer, PenLine, Store } from 'lucide-react'
import { PageHeader } from '@/components/app/ui'
import {
  JOB_DATES_AHEAD_DAYS,
  JOB_DATES_MAX,
  JOB_DESCRIPTION_MAX,
  JOB_POST_DAYS,
  JOB_REGIONS,
  JOB_SCOPES,
  WEEKDAYS,
  daysLabel,
  type DaysMode,
  type JobCard,
} from '@/lib/jobs'
import JobPostCard from './JobPostCard'

const INPUT = 'mt-1 h-12 w-full rounded-[11px] border border-hair bg-white px-3 text-base text-ink placeholder:text-faint'
const LABEL = 'text-[14.5px] font-semibold text-ink'
const DAY = 86_400_000
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

function Req() {
  return <span className="text-red-600"> *</span>
}
function Opt() {
  return <span className="font-medium text-faint"> (לא חובה)</span>
}

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`h-10 min-w-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[15px] font-bold ${
        on ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** "2026-12-06" for a local calendar day, without time zones moving it. */
function key(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * A month calendar where each tap adds or removes a day. A native date input
 * picks one day; a temporary job is a handful of them.
 */
function DatesPicker({ value, onChange, today }: { value: string[]; onChange: (dates: string[]) => void; today: string }) {
  const [year0, month0] = today.split('-').map(Number)
  const [view, setView] = useState({ year: year0, month: month0 - 1 })
  const last = new Date(Date.parse(`${today}T00:00:00Z`) + JOB_DATES_AHEAD_DAYS * DAY).toISOString().slice(0, 10)

  const first = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const length = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const move = (by: number) =>
    setView(({ year, month }) => {
      const next = month + by
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 }
    })
  const canBack = key(view.year, view.month, 1) > today
  const canForward = key(view.year, view.month, length) < last

  const toggle = (day: string) => {
    if (value.includes(day)) onChange(value.filter((item) => item !== day))
    else if (value.length < JOB_DATES_MAX) onChange([...value, day].sort())
  }

  return (
    <div className="mt-2.5 max-w-[340px] rounded-xl border border-hair p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canBack} aria-label="חודש קודם" className="grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
        <b className="text-[14.5px]">
          {MONTHS[view.month]} {view.year}
        </b>
        <button type="button" onClick={() => move(1)} disabled={!canForward} aria-label="חודש הבא" className="grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[13.5px]" role="grid">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((name) => (
          <span key={name} className="py-1 font-bold text-faint">
            {name}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />
          const id = key(view.year, view.month, day)
          const disabled = id < today || id > last
          const on = value.includes(id)
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={`tnum mx-auto my-0.5 grid h-9 w-9 place-items-center rounded-lg ${
                on ? 'bg-navy font-extrabold text-white' : disabled ? 'text-stone-300' : 'text-ink hover:bg-navy-soft'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface JobFormInitial {
  businessName: string
  region: string
  location: string
  phone: string
}

/**
 * The ad, in the order the owner asked for (2026-11-10): business, location,
 * role, salary, work days. Every text is typed freely. Work days are weekdays,
 * dates on a calendar, or free text. On a desktop the ad is previewed beside
 * the form as it will look on the board.
 */
export default function JobForm({
  side,
  initial,
  today,
  doneHref,
}: {
  side: 'carpenter' | 'supplier'
  initial: JobFormInitial
  /** Today, "YYYY-MM-DD", from the server. */
  today: string
  /** Where to go once posted. */
  doneHref: string
}) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(initial.businessName)
  const [region, setRegion] = useState(initial.region)
  const [location, setLocation] = useState(initial.location)
  const [role, setRole] = useState('')
  const [salary, setSalary] = useState('')
  const [daysMode, setDaysMode] = useState<DaysMode>('weekdays')
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4])
  const [hours, setHours] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [daysText, setDaysText] = useState('')
  const [scope, setScope] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState(initial.phone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview: JobCard = useMemo(
    () => ({
      id: 'preview',
      side,
      businessName,
      region,
      location,
      role,
      salary: salary.trim() || null,
      daysMode,
      weekdays,
      dates,
      daysText: daysText.trim() || null,
      hours: daysMode === 'weekdays' ? hours.trim() || null : null,
      scope: scope || null,
      description: description.trim() || null,
      createdAt: '',
      expiresAt: '',
      mine: false,
    }),
    [side, businessName, region, location, role, salary, daysMode, weekdays, dates, daysText, hours, scope, description]
  )

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ side, businessName, region, location, role, salary, daysMode, weekdays, dates, daysText, hours, scope, description, phone }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפרסום נכשל')
      router.push(doneHref)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפרסום נכשל')
      setBusy(false)
    }
  }

  const modes: { key: DaysMode; label: string; icon?: React.ReactNode }[] = [
    { key: 'weekdays', label: 'ימים בשבוע' },
    { key: 'dates', label: 'תאריכים', icon: <CalendarDays size={15} /> },
    { key: 'free', label: 'כתיבה חופשית', icon: <PenLine size={15} /> },
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PageHeader icon={Briefcase} title="מודעת דרושים חדשה" subtitle="לנגריות ולספקים · כל השדות בכתיבה חופשית" />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <section className="space-y-4 rounded-xl border border-hair bg-white p-4">
            <div>
              <span className={LABEL}>מפרסמים בתור</span>
              <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold text-navy">
                {side === 'supplier' ? <Store size={16} /> : <Hammer size={16} />}
                {side === 'supplier' ? 'ספק' : 'נגרייה'}
                <span className="text-[13px] font-normal text-muted">· לפי החשבון שלכם</span>
              </p>
            </div>

            <label className="block">
              <span className={LABEL}>
                {side === 'supplier' ? 'שם העסק' : 'שם הנגרייה'}
                <Req />
              </span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} className={INPUT} />
            </label>

            <div>
              <span className={LABEL}>
                מיקום
                <Req />
              </span>
              <div role="radiogroup" aria-label="אזור" className="mt-1.5 flex flex-wrap gap-2">
                {JOB_REGIONS.map((item) => (
                  <Chip key={item.key} on={region === item.key} onClick={() => setRegion(item.key)}>
                    {item.name}
                  </Chip>
                ))}
              </div>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={80}
                placeholder="עיר / אזור תעשייה"
                aria-label="עיר או אזור תעשייה"
                className={`${INPUT} mt-2.5`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <label className="block">
                <span className={LABEL}>
                  תפקיד
                  <Req />
                </span>
                <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="נגר/ית ייצור, מפעיל/ת CNC" className={INPUT} />
              </label>
              <label className="block">
                <span className={LABEL}>
                  שכר
                  <Opt />
                </span>
                <input value={salary} onChange={(e) => setSalary(e.target.value)} maxLength={80} placeholder="55–65 ₪ לשעה, לפי ניסיון" className={INPUT} />
              </label>
            </div>

            <div>
              <span className={LABEL}>
                ימי עבודה
                <Req />
              </span>
              <div role="tablist" aria-label="איך לתת את ימי העבודה" className="mt-1.5 inline-flex max-w-full gap-1 rounded-xl border border-hair bg-warm p-1">
                {modes.map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    role="tab"
                    aria-selected={daysMode === mode.key}
                    onClick={() => setDaysMode(mode.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-sm font-bold ${
                      daysMode === mode.key ? 'bg-white text-navy shadow-sm' : 'text-muted'
                    }`}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>

              {daysMode === 'weekdays' && (
                <>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {WEEKDAYS.map((name, index) => (
                      <Chip
                        key={name}
                        on={weekdays.includes(index)}
                        label={`יום ${name}`}
                        onClick={() =>
                          setWeekdays((list) => (list.includes(index) ? list.filter((day) => day !== index) : [...list, index].sort()))
                        }
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    maxLength={40}
                    placeholder="שעות (לא חובה), למשל 07:00–16:00"
                    aria-label="שעות"
                    className={`${INPUT} mt-2.5`}
                  />
                </>
              )}
              {daysMode === 'dates' && (
                <>
                  <DatesPicker value={dates} onChange={setDates} today={today} />
                  <p className="tnum mt-1 text-[12.5px] text-muted">
                    {dates.length ? `${dates.length} ימים נבחרו · ${daysLabel({ ...preview, daysMode: 'dates' }).replace(/ \(.*\)$/, '')}` : 'בוחרים יום אחד או כמה'}
                  </p>
                </>
              )}
              {daysMode === 'free' && (
                <input
                  value={daysText}
                  onChange={(e) => setDaysText(e.target.value)}
                  maxLength={120}
                  placeholder="למשל: 3 ימים בשבוע, גמיש"
                  aria-label="ימי עבודה"
                  className={`${INPUT} mt-2.5`}
                />
              )}
            </div>

            <div>
              <span className={LABEL}>
                היקף משרה
                <Opt />
              </span>
              <div role="radiogroup" aria-label="היקף משרה" className="mt-1.5 flex flex-wrap gap-2">
                {JOB_SCOPES.map((item) => (
                  <Chip key={item.key} on={scope === item.key} onClick={() => setScope(scope === item.key ? '' : item.key)}>
                    {item.short}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={LABEL}>
                כמה מילים
                <Opt />
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={JOB_DESCRIPTION_MAX}
                placeholder="ניסיון בייצור מטבחים וארונות. עבודה עם CNC – יתרון."
                className="mt-1 w-full rounded-[11px] border border-hair p-3 text-base placeholder:text-faint"
              />
            </label>

            <label className="block">
              <span className={LABEL}>
                טלפון לפניות
                <Req />
              </span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" maxLength={20} className={`${INPUT} text-end`} />
              <span className="mt-1 block text-[12.5px] text-muted">הטלפון מוצג רק לנגריות ולספקים רשומים, אחרי לחיצה על &quot;הצג טלפון&quot;.</span>
            </label>
          </section>

          <p className="text-[13.5px] text-muted">המודעה יורדת מהלוח אחרי {JOB_POST_DAYS} יום. אפשר לסגור אותה קודם ב&quot;המודעות שלי&quot;.</p>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="h-[52px] rounded-[11px] bg-brand text-lg font-extrabold text-navy hover:bg-brand-hover disabled:opacity-50">
            {busy ? 'מפרסם…' : 'פרסום המודעה'}
          </button>
        </form>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <p className="mb-2 text-[13px] font-extrabold text-faint">ככה זה ייראה בלוח</p>
          <JobPostCard card={preview} preview />
        </aside>
      </div>
    </div>
  )
}
