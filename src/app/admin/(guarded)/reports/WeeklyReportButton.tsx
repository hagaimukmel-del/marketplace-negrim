'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

/** Sends the Thursday signup report now, so it can be seen without waiting a week. */
export default function WeeklyReportButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/weekly-report', { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        counts?: { carpentersSelf: number; suppliersApplied: number }
      }
      setMessage(
        response.ok && data.counts
          ? { ok: true, text: `נשלח. השבוע: ${data.counts.carpentersSelf} נגריות, ${data.counts.suppliersApplied} ספקים.` }
          : { ok: false, text: data.error ?? 'הדוח לא נשלח' }
      )
    } catch {
      setMessage({ ok: false, text: 'הדוח לא נשלח' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-base font-semibold text-stone-700 disabled:opacity-50"
      >
        <Mail size={16} />
        {busy ? 'שולח…' : 'שלח דוח הרשמות שבועי עכשיו'}
      </button>
      {message && <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p>}
    </div>
  )
}
