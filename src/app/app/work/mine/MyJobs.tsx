'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { regionName } from '@/lib/regions'
import { CLOSE_OUTCOMES, jobTypeName, shortDate, type CloseOutcome } from '@/lib/work'

export interface MyJob {
  id: string
  jobType: string
  quantity: string
  material: string | null
  region: string
  dueDate: string
  status: string
  closeOutcome: string | null
  removedByAdmin: boolean
  expiresAt: string
  createdAt: string
  /** Carpentries that answered: one conversation each. */
  answers: number
}

function stateOf(job: MyJob, now: number): { label: string; tone: string; active: boolean } {
  if (job.status === 'closed') {
    const outcome = CLOSE_OUTCOMES.find((item) => item.key === job.closeOutcome)
    return { label: outcome ? `נסגרה: ${outcome.name}` : 'נסגרה', tone: 'bg-sky-100 text-sky-900', active: false }
  }
  if (job.status === 'removed') {
    return { label: job.removedByAdmin ? 'הוסרה על ידי הנהלת האתר' : 'הוסרה', tone: 'bg-red-100 text-red-800', active: false }
  }
  if (job.status === 'paused') return { label: 'מושהית עד בדיקה', tone: 'bg-amber-100 text-amber-900', active: true }
  if (new Date(job.expiresAt).getTime() <= now) return { label: 'ירדה מהלוח', tone: 'bg-stone-200 text-stone-700', active: false }
  return { label: 'בלוח', tone: 'bg-emerald-100 text-emerald-900', active: true }
}

/**
 * The poster's own jobs. Closing asks one question, how it ended: that answer
 * is the number that shows whether the board works.
 */
export default function MyJobs({ jobs, now }: { jobs: MyJob[]; now: number }) {
  const router = useRouter()
  const [closing, setClosing] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<CloseOutcome | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/work/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      setClosing(null)
      setOutcome('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (jobs.length === 0) {
    return <p className="rounded-2xl border border-hair bg-white p-8 text-center text-muted">עוד לא פרסמתם עבודות.</p>
  }

  return (
    <div className="grid gap-2.5">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {jobs.map((job) => {
        const state = stateOf(job, now)
        return (
          <div key={job.id} className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-start gap-2">
              <Link href={`/app/work/${job.id}`} className="min-w-0 flex-1">
                <span className="text-[13px] font-bold text-[#0E5E5E]">{jobTypeName(job.jobType)}</span>
                <b className="block truncate text-ink">{job.material ? `${job.quantity} · ${job.material}` : job.quantity}</b>
                <span className="tnum text-sm text-muted">
                  {regionName(job.region)} · ביצוע עד {shortDate(job.dueDate)}
                </span>
              </Link>
              {job.answers > 0 && (
                <Link href="/app/work/messages" className="shrink-0 rounded-full bg-[#E2F0EF] px-2 py-0.5 text-xs font-bold text-[#0B5A5A]">
                  {job.answers === 1 ? 'פנייה אחת' : `${job.answers} פניות`}
                </Link>
              )}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
            </div>

            {state.active && closing !== job.id && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-hair pt-3">
                <button type="button" onClick={() => setClosing(job.id)} className="h-10 rounded-[11px] bg-[#0E5E5E] px-4 text-sm font-bold text-white">
                  סגירת העבודה
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm('להסיר את העבודה מהלוח?')) void send({ id: job.id, action: 'remove' })
                  }}
                  className="h-10 rounded-[11px] border border-hair px-4 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  הסרה
                </button>
              </div>
            )}

            {closing === job.id && (
              <div className="mt-3 space-y-3 border-t border-hair pt-3">
                <p className="m-0 font-bold text-ink">איך זה נגמר?</p>
                <div role="radiogroup" aria-label="איך זה נגמר" className="flex flex-wrap gap-2">
                  {CLOSE_OUTCOMES.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={outcome === item.key}
                      onClick={() => setOutcome(item.key)}
                      className={`h-10 rounded-full border px-3.5 text-sm font-semibold ${
                        outcome === item.key ? 'border-[#0E5E5E] bg-[#0E5E5E] text-white' : 'border-hair bg-white text-ink'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!outcome || busy}
                    onClick={() => send({ id: job.id, action: 'close', outcome })}
                    className="h-10 rounded-[11px] bg-[#0E5E5E] px-4 text-sm font-bold text-white disabled:opacity-40"
                  >
                    סגירה
                  </button>
                  <button type="button" onClick={() => setClosing(null)} className="h-10 rounded-[11px] px-3 text-sm text-muted">
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
