'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flag, Handshake, RotateCcw, Trash2, X } from 'lucide-react'
import { regionName } from '@/lib/regions'
import { CLOSE_OUTCOMES, REPORT_REASONS, jobTypeName, shortDate } from '@/lib/work'

export interface AdminJob {
  id: string
  jobType: string
  region: string
  quantity: string
  material: string | null
  dueDate: string
  description: string
  image: string | null
  status: string
  closeOutcome: string | null
  removedReason: string | null
  live: boolean
  createdAt: string
  owner: string
  ownerActive: boolean
}

export interface AdminWorkReport {
  id: string
  jobId: string
  reason: string
  note: string | null
  createdAt: string
  reporter: string
}

type State = 'live' | 'paused' | 'expired' | 'closed' | 'removed'
type Filter = State | 'all'

function stateOf(job: AdminJob): State {
  if (job.status === 'closed') return 'closed'
  if (job.status === 'removed') return 'removed'
  if (job.status === 'paused') return 'paused'
  return job.live ? 'live' : 'expired'
}

const STATE_LABEL: Record<State, { label: string; tone: string }> = {
  live: { label: 'בלוח', tone: 'bg-emerald-100 text-emerald-900' },
  paused: { label: 'מושהית', tone: 'bg-amber-100 text-amber-900' },
  expired: { label: 'פג תוקף', tone: 'bg-stone-200 text-stone-700' },
  closed: { label: 'נסגרה', tone: 'bg-sky-100 text-sky-900' },
  removed: { label: 'הוסרה', tone: 'bg-red-100 text-red-800' },
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'live', label: 'בלוח' },
  { key: 'paused', label: 'מושהות' },
  { key: 'expired', label: 'פג תוקף' },
  { key: 'closed', label: 'נסגרו' },
  { key: 'removed', label: 'הוסרו' },
  { key: 'all', label: 'הכל' },
]

function reasonLabel(key: string): string {
  return REPORT_REASONS.find((item) => item.key === key)?.name ?? key
}

function headline(job: AdminJob): string {
  return job.material ? `${job.quantity} · ${job.material}` : job.quantity
}

function date(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
}

/** Moderating the work board, with the launch condition on top. */
export default function WorkAdmin({
  jobs,
  reports,
  profiles,
  members,
  boardOpen,
}: {
  jobs: AdminJob[]
  reports: AdminWorkReport[]
  profiles: number
  members: number
  boardOpen: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('live')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs])
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { live: 0, paused: 0, expired: 0, closed: 0, removed: 0, all: jobs.length }
    jobs.forEach((job) => (result[stateOf(job)] += 1))
    return result
  }, [jobs])
  const outcomes = useMemo(
    () => CLOSE_OUTCOMES.map((item) => ({ ...item, count: jobs.filter((job) => job.closeOutcome === item.key).length })),
    [jobs]
  )
  const shown = filter === 'all' ? jobs : jobs.filter((job) => stateOf(job) === filter)

  const send = async (key: string, body: Record<string, unknown>) => {
    setBusy(key)
    setError(null)
    try {
      const response = await fetch('/api/admin/work', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  const remove = (job: AdminJob, reason: string) => {
    if (!confirm(`להסיר את "${headline(job)}" מהלוח?`)) return
    void send(job.id, { action: 'remove', job_id: job.id, reason })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <Handshake size={21} className="text-teal-700" />
          נגרים עובדים ביחד
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${boardOpen ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
            {boardOpen ? 'הלוח פתוח' : 'הלוח סגור לנגריות'}
          </span>
        </h1>
        <p className="tnum mt-1 text-sm text-stone-600">
          {profiles}/30 פרופילים · {counts.live}/10 עבודות בלוח · {members} נגריות עם מנוי (מייסדות כרגע)
        </p>
        <p className="tnum mt-0.5 text-xs text-stone-500">
          סגירות: {outcomes.map((item) => `${item.name} ${item.count}`).join(' · ')}
        </p>
        <Link href="/app/work" className="mt-1 inline-block text-sm font-semibold text-teal-800 underline">
          ללוח כפי שנגרייה רואה
        </Link>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Flag size={15} className="text-red-700" />
          דיווחים פתוחים ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">אין דיווחים שמחכים לטיפול.</p>
        ) : (
          reports.map((report) => {
            const job = byId.get(report.jobId)
            return (
              <div key={report.id} className="rounded-xl border border-red-200 bg-white p-3">
                <p className="font-bold text-stone-900">
                  {job ? (
                    <>
                      <span className="me-2 rounded bg-teal-50 px-1.5 text-xs text-teal-800">{jobTypeName(job.jobType)}</span>
                      {headline(job)}
                    </>
                  ) : (
                    'עבודה'
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  של {job?.owner ?? '—'} · דיווח של {report.reporter} · {date(report.createdAt)}
                  {job?.status === 'paused' && ' · הושהתה אוטומטית'}
                </p>
                {job && <p className="mt-1 line-clamp-3 text-sm text-stone-700">{job.description}</p>}
                <p className="mt-1 text-sm font-semibold text-red-800">{reasonLabel(report.reason)}</p>
                {report.note && <p className="mt-0.5 text-sm text-stone-700">{report.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {job && (job.status === 'open' || job.status === 'paused') && (
                    <button type="button" onClick={() => remove(job, reasonLabel(report.reason))} disabled={busy !== null} className="flex h-10 items-center gap-1.5 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
                      <Trash2 size={15} />
                      הסר את העבודה
                    </button>
                  )}
                  {job?.status === 'paused' ? (
                    <button type="button" onClick={() => send(job.id, { action: 'restore', job_id: job.id })} disabled={busy !== null} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50">
                      <RotateCcw size={15} />
                      העבודה תקינה, החזר ללוח
                    </button>
                  ) : (
                    <button type="button" onClick={() => send(report.id, { action: 'dismiss_report', report_id: report.id })} disabled={busy !== null} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50">
                      <X size={15} />
                      העבודה תקינה, סגור דיווח
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                filter === item.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {item.label}
              <span className="tnum text-xs opacity-60">{counts[item.key]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">אין עבודות כאן.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {shown.map((job) => {
              const state = STATE_LABEL[stateOf(job)]
              return (
                <div key={job.id} className="flex items-center gap-3 border-b border-stone-100 p-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/work/${job.id}`} className="block truncate font-semibold text-stone-900 hover:underline">
                      <span className="me-2 rounded bg-teal-50 px-1.5 text-xs text-teal-800">{jobTypeName(job.jobType)}</span>
                      {headline(job)}
                    </Link>
                    <p className="tnum truncate text-xs text-stone-500">
                      {job.owner}
                      {!job.ownerActive && ' (חסום)'} · {regionName(job.region)} · ביצוע עד {shortDate(job.dueDate)} · פורסם {date(job.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                  {job.status === 'removed' || job.status === 'paused' ? (
                    <button type="button" onClick={() => send(job.id, { action: 'restore', job_id: job.id })} disabled={busy !== null} aria-label="החזר ללוח" title="החזר ללוח" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-40">
                      <RotateCcw size={16} />
                    </button>
                  ) : job.status === 'open' ? (
                    <button type="button" onClick={() => remove(job, 'manual')} disabled={busy !== null} aria-label="הסר" title="הסר" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span className="w-9 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
