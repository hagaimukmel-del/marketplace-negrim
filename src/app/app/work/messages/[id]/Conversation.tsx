'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, FileText, Paperclip, Phone, Send, X } from 'lucide-react'
import { downscaleImage } from '@/lib/image-downscale'
import { FILE_MAX_BYTES, FILE_TYPES, MESSAGE_MAX } from '@/lib/work-chat'
import type { ChatFile, ConversationDetail } from '@/lib/work-chat-server'

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function Attachment({ file, mine }: { file: ChatFile; mine: boolean }) {
  const href = `/api/work/files/${file.messageId}`
  if (file.type.startsWith('image/')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={file.name} className="max-h-64 rounded-xl bg-stone-100 object-contain" />
      </a>
    )
  }
  return (
    <a
      href={href}
      className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
        mine ? 'bg-white/15 text-white' : 'bg-stone-100 text-ink'
      }`}
    >
      <FileText size={18} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      <span className="tnum shrink-0 text-xs opacity-80">{size(file.size)}</span>
    </a>
  )
}

/**
 * One conversation between two carpentries about a job: messages as bubbles
 * (mine on the start side), a composer with one optional photo or PDF, and
 * the two choices each side makes for itself: share my phone, or block.
 * Reads again every 30 seconds while open, so an answer shows without a reload.
 */
export default function Conversation({ conversation, canSharePhone }: { conversation: ConversationDetail; canSharePhone: boolean }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const api = `/api/work/conversations/${conversation.id}`

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [conversation.messages.length])

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000)
    return () => clearInterval(timer)
  }, [router])

  const pick = async (chosen: File | undefined) => {
    setError(null)
    if (!chosen) return
    if (!(FILE_TYPES as readonly string[]).includes(chosen.type)) {
      setError('אפשר לצרף תמונה (JPG, PNG, WEBP) או PDF')
      return
    }
    const ready = chosen.type.startsWith('image/') ? await downscaleImage(chosen) : chosen
    if (ready.size > FILE_MAX_BYTES) {
      setError('קובץ עד 10MB')
      return
    }
    setFile(ready)
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim() && !file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('body', text)
      if (file) form.set('file', file)
      const response = await fetch(api, { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      setText('')
      setFile(null)
      if (picker.current) picker.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const act = async (action: 'block' | 'unblock' | 'share_phone') => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(api, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const writable = conversation.readOnlyReason == null

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-lg font-bold text-ink">
            {conversation.counterpart}
            {conversation.counterpartCity && <span className="font-normal text-muted"> · {conversation.counterpartCity}</span>}
          </h1>
          <p className="m-0 truncate text-sm text-muted">
            {conversation.side === 'poster' ? 'פנתה לעבודה שלכם: ' : 'פניתם לעבודה: '}
            {conversation.subject}
          </p>
        </div>
        {writable && canSharePhone && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm('לשלוח בשיחה את הטלפון של הנגרייה?')) void act('share_phone')
            }}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#8CC9C2] bg-white px-3 text-sm font-semibold text-[#0B5A5A] disabled:opacity-50"
          >
            <Phone size={15} />
            שיתוף הטלפון שלי
          </button>
        )}
        {conversation.blockedBy === 'me' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => act('unblock')}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-hair bg-white px-3 text-sm font-semibold text-ink disabled:opacity-50"
          >
            ביטול חסימה
          </button>
        ) : conversation.blockedBy == null ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm('לחסום את הנגרייה בשיחה הזאת? אף צד לא יוכל לכתוב עד שתבטלו.')) void act('block')
            }}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-hair bg-white px-3 text-sm font-semibold text-muted disabled:opacity-50"
          >
            <Ban size={15} />
            חסימה
          </button>
        ) : null}
      </header>

      <p className="m-0 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
        קבצים מגיעים מנגריות אחרות ולא נסרקים. פתחו אותם בזהירות.
      </p>

      <div className="space-y-2 rounded-2xl border border-hair bg-stone-50 p-3">
        {conversation.messages.map((message) => (
          <div key={message.id} className={`flex ${message.mine ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed sm:max-w-[70%] ${
                message.mine ? 'bg-[#0E5E5E] text-white' : 'border border-hair bg-white text-ink'
              }`}
            >
              {message.file && <Attachment file={message.file} mine={message.mine} />}
              {message.body && <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>}
              <span className={`tnum mt-0.5 block text-[11px] ${message.mine ? 'text-[#CDE7E4]' : 'text-stone-400'}`}>
                {when(message.createdAt)}
              </span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      {writable ? (
        <form onSubmit={send} className="sticky bottom-24 grid gap-2 rounded-2xl border border-hair bg-white p-2 md:bottom-4">
          {file && (
            <div className="flex items-center gap-2 rounded-xl bg-[#E2F0EF] px-3 py-2 text-sm text-[#0B5A5A]">
              <Paperclip size={15} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button
                type="button"
                aria-label="הסרת הקובץ"
                onClick={() => {
                  setFile(null)
                  if (picker.current) picker.current.value = ''
                }}
                className="grid h-8 w-8 place-items-center rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={picker}
              type="file"
              accept={FILE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => void pick(event.target.files?.[0])}
            />
            <button
              type="button"
              aria-label="צירוף תמונה או PDF"
              onClick={() => picker.current?.click()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-hair text-[#0B5A5A]"
            >
              <Paperclip size={19} />
            </button>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={MESSAGE_MAX}
              placeholder="כתבו הודעה…"
              aria-label="הודעה"
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-hair p-2.5 text-[16px]"
            />
            <button
              type="submit"
              disabled={busy || (!text.trim() && !file)}
              aria-label="שליחה"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0E5E5E] text-white disabled:opacity-50"
            >
              <Send size={19} className="-scale-x-100" />
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">{conversation.readOnlyReason}</p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
