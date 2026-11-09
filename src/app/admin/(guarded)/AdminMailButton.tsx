'use client'

import { useState } from 'react'
import { Mail, Send, X } from 'lucide-react'
import { BODY_MAX, SUBJECT_MAX, type MailSide } from '@/lib/admin-mail-rules'

/**
 * "שלח מייל" on a supplier's or a carpentry's row: a short form that sends one
 * message from the site, with replies going to the company's main inbox.
 */
export default function AdminMailButton({ side, id, email, name }: { side: MailSide; id: string; email: string | null; name: string }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!email) return null

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: { side, id }, subject, body }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      setMessage({ ok: true, text: `נשלח אל ${data.to ?? email}. תשובות יגיעו ל-nagarim.b2b@gmail.com.` })
      setSubject('')
      setBody('')
      setOpen(false)
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'השליחה נכשלה' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setMessage(null)
          }}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700"
        >
          <Mail size={13} />
          שלח מייל
        </button>
      )}
      {open && (
        <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm text-stone-600">
              אל <span className="font-semibold text-stone-800">{name}</span> · <span dir="ltr">{email}</span>
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="סגור" className="shrink-0 text-stone-400 hover:text-stone-700">
              <X size={16} />
            </button>
          </div>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={SUBJECT_MAX}
            placeholder="נושא"
            className="h-10 w-full rounded-lg border border-stone-300 px-3 text-base"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={BODY_MAX}
            rows={6}
            placeholder="תוכן ההודעה. שורה ריקה מתחילה פסקה חדשה."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
          <p className="text-xs text-stone-500">נשלח מכתובת האתר בשם נגרים B2B. תשובות מגיעות ל-nagarim.b2b@gmail.com.</p>
          <button
            type="button"
            disabled={busy || !subject.trim() || !body.trim()}
            onClick={send}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send size={14} />
            {busy ? 'שולח…' : 'שלח'}
          </button>
        </div>
      )}
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
