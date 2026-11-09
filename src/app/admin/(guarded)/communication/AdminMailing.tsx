'use client'

import { useState } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { BODY_MAX, SUBJECT_MAX, mailSubject, isMarketingMailing, type MailAudience } from '@/lib/admin-mail-rules'

const AUDIENCE_LABEL: Record<MailAudience, string> = {
  suppliers: 'כל הספקים המאושרים',
  carpenters: 'כל הנגרים שהסכימו לדיוור',
}

/**
 * One message to every approved supplier or to every carpentry that agreed to
 * offers by mail. Two steps: count who it reaches, then send.
 */
export default function AdminMailing() {
  const [audience, setAudience] = useState<MailAudience>('suppliers')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [marked, setMarked] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const marketing = isMarketingMailing(audience, marked)
  const ready = subject.trim() && body.trim()

  const reset = () => {
    setCount(null)
    setMessage(null)
  }

  const check = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/mail?audience=${audience}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'לא הצלחתי לספור נמענים')
      setCount(data.count)
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'לא הצלחתי לספור נמענים' })
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, subject, body, marketing: marked }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'השליחה נכשלה')
      const rest = data.queued - data.sent
      setMessage({
        ok: true,
        text: `נכנסו לתור ${data.queued} מיילים, ${data.sent} כבר נשלחו.${rest > 0 ? ` השאר יישלחו בדקות הקרובות.` : ''}`,
      })
      setSubject('')
      setBody('')
      setCount(null)
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'השליחה נכשלה' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
        <Megaphone size={16} className="text-emerald-700" />
        שליחת מייל לכולם
      </h2>
      <p className="text-sm text-stone-600">
        מייל לספק או לנגר אחד שולחים מהשורה שלו ברשימת הספקים או הנגרים. כאן שולחים הודעה אחת לרשימה שלמה. תשובות מגיעות ל-nagarim.b2b@gmail.com.
      </p>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(AUDIENCE_LABEL) as MailAudience[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setAudience(key)
              reset()
            }}
            className={`h-9 rounded-lg border px-3 text-sm font-semibold ${audience === key ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-300 text-stone-700'}`}
          >
            {AUDIENCE_LABEL[key]}
          </button>
        ))}
      </div>

      {audience === 'carpenters' ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          לפי החוק (סעיף 30א) נשלח רק לנגריות שהסכימו לקבל דיוור ואימתו את המייל. הנושא יתחיל ב&quot;פרסומת:&quot; ובתחתית יופיע קישור הסרה.
        </p>
      ) : (
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={marked}
            onChange={(event) => {
              setMarked(event.target.checked)
              reset()
            }}
            className="mt-1"
          />
          <span>זו הודעה פרסומית (מבצע, הצעה). הנושא יתחיל ב&quot;פרסומת:&quot; ותתווסף אפשרות הסרה. השאר ריק להודעה תפעולית.</span>
        </label>
      )}

      <input
        value={subject}
        onChange={(event) => {
          setSubject(event.target.value)
          reset()
        }}
        maxLength={SUBJECT_MAX}
        placeholder="נושא"
        className="h-10 w-full rounded-lg border border-stone-300 px-3 text-base"
      />
      <textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          reset()
        }}
        maxLength={BODY_MAX}
        rows={7}
        placeholder="תוכן ההודעה. שורה ריקה מתחילה פסקה חדשה."
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
      />

      {count === null ? (
        <button
          type="button"
          disabled={busy || !ready}
          onClick={check}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
        >
          המשך
        </button>
      ) : (
        <div className="space-y-2 rounded-lg bg-stone-50 p-3">
          <p className="text-sm text-stone-700">
            יישלח אל <span className="tnum font-bold">{count}</span> נמענים ({AUDIENCE_LABEL[audience]}), בנושא:{' '}
            <span className="font-semibold">{mailSubject(subject.trim(), marketing)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || count === 0}
              onClick={send}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send size={14} />
              {busy ? 'שולח… (זה יכול לקחת כמה דקות)' : `שלח ל-${count}`}
            </button>
            <button type="button" disabled={busy} onClick={reset} className="h-10 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700">
              ביטול
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={`rounded-lg p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}
