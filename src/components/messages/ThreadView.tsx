'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCheck, RotateCcw, Send } from 'lucide-react'
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

const draftKey = (threadId: string) => `nb-draft:${threadId}`

function readDraft(threadId: string): string {
  try {
    return window.localStorage.getItem(draftKey(threadId)) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(threadId: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(draftKey(threadId), value)
    else window.localStorage.removeItem(draftKey(threadId))
  } catch {
    // Private mode or storage off: the draft just is not kept.
  }
}

/**
 * One conversation: the messages as bubbles (mine on the start side), lines
 * from the site in the middle, a composer that stays reachable above the
 * phone keyboard, and "טופל".
 *
 * Nothing typed is lost: the draft is kept on the device until it is sent, a
 * failed send keeps the text and says so, and a retry carries the same id so
 * the server never saves it twice. It reads again every 30 seconds and the
 * moment the tab comes back into view, so an answer shows without a reload.
 * Each of my messages says whether the other side has opened it.
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
  const storedDraft = useSyncExternalStore(
    () => () => {},
    () => readDraft(thread.id),
    () => ''
  )
  // null until the person types: until then the composer shows the kept draft.
  const [typed, setTyped] = useState<string | null>(null)
  const text = typed ?? storedDraft
  const setText = (value: string) => {
    setTyped(value)
    writeDraft(thread.id, value)
  }
  // One id per message being sent, kept across retries until it goes through.
  const pendingId = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [thread.messages.length])

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [router])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    pendingId.current ??= crypto.randomUUID()
    try {
      const res = await fetch(`${apiBase}/${thread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, clientId: pendingId.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'השליחה נכשלה')
      pendingId.current = null
      setText('')
      router.refresh()
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      const reason = offline ? 'אין חיבור לאינטרנט' : err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'השליחה נכשלה'
      setError(`${reason}. ההודעה לא נשלחה, והיא שמורה כאן. לחצו שוב על שליחה.`)
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
          <p className="m-0 truncate text-base text-stone-500">
            {thread.subject}
            {thread.status === 'handled' && ' · טופל'}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={toggleHandled}
            disabled={busy}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-base font-semibold text-stone-700 disabled:opacity-50"
          >
            {thread.status === 'handled' ? <RotateCcw size={15} /> : <Check size={15} />}
            {thread.status === 'handled' ? 'פתח מחדש' : 'סמן כטופל'}
          </button>
        )}
      </header>

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        {thread.messages.map((message) =>
          message.system ? (
            // The time sits on its own line, isolated: inline after a body that
            // ends in a date ("בתוקף עד 9.11") the two read as one number.
            <div key={message.id} className="mx-auto my-1 max-w-[90%] rounded-2xl bg-stone-200/70 px-4 py-2 text-center text-stone-800">
              <p className="m-0 whitespace-pre-line break-words">{message.body}</p>
              <bdi dir="ltr" className="tnum mt-0.5 block text-sm text-stone-500">{when(message.createdAt)}</bdi>
            </div>
          ) : (
            <div key={message.id} className={`flex ${message.mine ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-base leading-relaxed sm:max-w-[70%] ${
                  message.mine ? 'bg-emerald-700 text-white' : 'border border-stone-200 bg-white text-stone-900'
                }`}
              >
                <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
                <span className={`tnum mt-0.5 flex items-center gap-1 text-xs ${message.mine ? 'text-emerald-100' : 'text-stone-400'}`}>
                  <bdi dir="ltr">{when(message.createdAt)}</bdi>
                  {message.mine &&
                    (thread.otherReadAt && new Date(thread.otherReadAt) >= new Date(message.createdAt) ? (
                      <>
                        <CheckCheck size={13} aria-hidden /> נקרא
                      </>
                    ) : (
                      <>
                        <Check size={13} aria-hidden /> נשלח
                      </>
                    ))}
                </span>
              </div>
            </div>
          )
        )}
        <div ref={end} />
      </div>

      {readOnly ? (
        <p className="rounded-lg bg-stone-100 p-3 text-base text-stone-600">צפייה בלבד.</p>
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
      {error && <p className="rounded-lg bg-red-50 p-3 text-base text-red-700">{error}</p>}
    </div>
  )
}
