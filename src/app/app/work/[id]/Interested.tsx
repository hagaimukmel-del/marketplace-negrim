'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { MESSAGE_MAX } from '@/lib/work-chat'

/**
 * "אני מעוניין": opens a private conversation with the poster, with a first
 * message, then goes to it. The first message is required so the poster
 * hears something about who is answering, not an empty knock.
 */
export default function Interested({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/work/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, body: text }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      router.push(`/app/work/messages/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-[#0E5E5E] font-bold text-white hover:bg-[#0B4F4F]"
      >
        <MessageSquare size={18} />
        אני מעוניין
      </button>
    )
  }

  return (
    <form onSubmit={send} className="grid gap-2 text-start">
      <label htmlFor="first-message" className="text-sm font-bold text-[#0B5A5A]">
        הודעה ראשונה לנגרייה שפרסמה
      </label>
      <textarea
        id="first-message"
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        maxLength={MESSAGE_MAX}
        placeholder="מי אתם, מה יש לכם לעבודה הזאת (מכונה, ניסיון, זמינות) ומתי אפשר להתחיל"
        className="w-full rounded-xl border border-[#8CC9C2] bg-white p-3 text-[16px]"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="flex h-12 items-center justify-center gap-2 rounded-[11px] bg-[#0E5E5E] font-bold text-white disabled:opacity-50"
      >
        <Send size={17} className="-scale-x-100" />
        {busy ? 'שולח…' : 'שליחה'}
      </button>
      {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </form>
  )
}
