'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RotateCcw, Send } from 'lucide-react'
import type { ThreadDetail } from '@/lib/messages'

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * One conversation: the messages as bubbles (mine on the start side), a
 * composer that stays reachable above the phone keyboard, and "טופל". Reads
 * again every 30 seconds while open, so an answer shows without a reload.
 */
export default function ThreadView({
  thread,
  apiBase,
  readOnly = false,
  composerClass = 'bottom-24 md:bottom-4',
}: {
  thread: ThreadDetail
  /** '/api/app/messages' or '/api/supplier/messages'. */
  apiBase: string
  /** The operator looking at a supplier's console: nothing can be sent. */
  readOnly?: boolean
  /** Where the composer sticks: above the carpenter app's bottom bar on a phone. */
  composerClass?: string
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [thread.messages.length])

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000)
    return () => clearInterval(timer)
  }, [router])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/${thread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'השליחה נכשלה')
      setText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const toggleHandled = async () => {
    setBusy(true)
    try {
      await fetch(`${apiBase}/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handled: thread.status !== 'handled' }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-lg font-bold text-stone-900">{thread.counterpart}</h1>
          <p className="m-0 truncate text-sm text-stone-500">
            {thread.subject}
            {thread.status === 'handled' && ' · טופל'}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={toggleHandled}
            disabled={busy}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
          >
            {thread.status === 'handled' ? <RotateCcw size={15} /> : <Check size={15} />}
            {thread.status === 'handled' ? 'פתח מחדש' : 'סמן כטופל'}
          </button>
        )}
      </header>

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        {thread.messages.map((message) => (
          <div key={message.id} className={`flex ${message.mine ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed sm:max-w-[70%] ${
                message.mine ? 'bg-emerald-700 text-white' : 'border border-stone-200 bg-white text-stone-900'
              }`}
            >
              <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
              <span className={`tnum mt-0.5 block text-[11px] ${message.mine ? 'text-emerald-100' : 'text-stone-400'}`}>
                {when(message.createdAt)}
              </span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      {readOnly ? (
        <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-600">צפייה בלבד.</p>
      ) : (
        <form onSubmit={send} className={`sticky ${composerClass} flex items-end gap-2 rounded-2xl border border-stone-200 bg-white p-2`}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="כתבו הודעה…"
            aria-label="הודעה"
            className="min-h-[48px] flex-1 resize-none rounded-xl border border-stone-200 p-2.5 text-[16px]"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="שלח"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white disabled:opacity-50"
          >
            <Send size={19} className="-scale-x-100" />
          </button>
        </form>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
