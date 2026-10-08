'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

/**
 * The first message of a thread: to a supplier about a product, or to the
 * other side about an order. An order that already has a thread gets this
 * message added to it, so there is one conversation per order.
 */
export default function NewMessage({
  apiBase,
  hrefBase,
  to,
  about,
  payload,
}: {
  apiBase: string
  hrefBase: string
  to: string
  about: string
  payload: Record<string, string>
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'השליחה נכשלה')
      router.replace(`${hrefBase}/${data.threadId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div>
        <h1 className="m-0 text-lg font-bold text-stone-900">הודעה ל{to}</h1>
        <p className="m-0 text-sm text-stone-500">{about}</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={2000}
        autoFocus
        placeholder="כתבו כאן. התשובה תגיע להודעות באתר, ותקבלו עליה מייל."
        aria-label="הודעה"
        className="w-full rounded-xl border border-stone-300 bg-white p-3 text-[16px]"
      />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 font-bold text-white disabled:opacity-50 sm:w-auto sm:px-8"
      >
        <Send size={18} className="-scale-x-100" />
        {busy ? 'שולח…' : 'שלח'}
      </button>
    </form>
  )
}
