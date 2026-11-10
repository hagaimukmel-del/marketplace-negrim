'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus } from 'lucide-react'
import { PageHeader } from '@/components/app/ui'
import { daysLabel, jobRegionName, postedAgo, type MyJob } from '@/lib/jobs'

function state(job: MyJob, now: number): { label: string; live: boolean } {
  if (job.status === 'closed') return { label: 'סגורה', live: false }
  if (new Date(job.expiresAt).getTime() <= now) return { label: 'פג תוקף', live: false }
  const left = Math.ceil((new Date(job.expiresAt).getTime() - now) / 86_400_000)
  return { label: `בלוח · עוד ${left} ימים`, live: true }
}

/** The poster's own ads: close one once somebody is found, or put it back up. */
export default function MyJobs({
  jobs,
  side,
  boardHref,
  newHref,
  now,
}: {
  jobs: MyJob[]
  side: 'carpenter' | 'supplier'
  boardHref: string
  newHref: string
  now: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (id: string, action: 'close' | 'extend') => {
    if (action === 'close' && !confirm('לסגור את המודעה? היא תרד מהלוח.')) return
    setBusy(id)
    setError(null)
    try {
      const response = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action, side }),
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

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-6">
      <PageHeader
        icon={Briefcase}
        title="המודעות שלי"
        subtitle={<Link href={boardHref} className="font-semibold text-brand-ink underline">חזרה ללוח דרושים</Link>}
        actions={
          <Link href={newHref} className="flex h-11 items-center gap-1.5 rounded-[11px] bg-brand px-3.5 text-sm font-extrabold text-navy hover:bg-brand-hover">
            <Plus size={16} />
            מודעה חדשה
          </Link>
        }
      />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-hair bg-white p-8 text-center text-muted">עוד לא פרסמתם מודעת דרושים.</div>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {jobs.map((job) => {
            const { label, live } = state(job, now)
            return (
              <li key={job.id} className="rounded-2xl border border-hair bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[17px] text-ink">{job.role}</b>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-bold ${live ? 'bg-ok-soft text-ok-ink' : 'bg-stone-100 text-muted'}`}>{label}</span>
                </div>
                <p className="tnum mt-1 text-sm text-muted">
                  {jobRegionName(job.region)} · {job.location} · {daysLabel(job)} · פורסמה {postedAgo(job.createdAt, now)}
                </p>
                <div className="mt-3 flex gap-2">
                  {live ? (
                    <button
                      type="button"
                      disabled={busy === job.id}
                      onClick={() => act(job.id, 'close')}
                      className="h-10 rounded-[11px] border border-hair bg-white px-3 text-sm font-bold text-ink disabled:opacity-50"
                    >
                      מצאתי, לסגור
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy === job.id}
                    onClick={() => act(job.id, 'extend')}
                    className="h-10 rounded-[11px] border border-hair bg-white px-3 text-sm font-bold text-ink disabled:opacity-50"
                  >
                    {live ? 'להאריך ב-30 יום' : 'להחזיר ללוח'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
