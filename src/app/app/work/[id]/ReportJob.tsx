'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { REPORT_REASONS, type ReportReason } from '@/lib/work'

/** Reporting a job, at the bottom of the page where it is found but not in the way. */
export default function ReportJob({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/work/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, reason, note }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הדיווח נכשל')
      setDone(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הדיווח נכשל')
    } finally {
      setBusy(false)
    }
  }

  if (done) return <p className="text-center text-sm text-muted">תודה. הדיווח הגיע אלינו ונבדוק אותו.</p>

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mx-auto flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Flag size={14} />
        דיווח על העבודה
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-hair bg-white p-4">
      <p className="m-0 font-bold text-ink">מה לא בסדר בעבודה?</p>
      <div role="radiogroup" aria-label="סיבה" className="flex flex-wrap gap-2">
        {REPORT_REASONS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={reason === item.key}
            onClick={() => setReason(item.key)}
            className={`h-10 rounded-full border px-3.5 text-sm font-semibold ${
              reason === item.key ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-medium text-ink">הערה (לא חובה)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-[11px] border border-hair p-3" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={!reason || busy} className="h-10 rounded-[11px] bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40">
          שליחת דיווח
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-[11px] px-3 text-sm text-muted">
          ביטול
        </button>
      </div>
    </div>
  )
}
