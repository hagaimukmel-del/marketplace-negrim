'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, MailWarning, RotateCcw } from 'lucide-react'
import type { CommunicationHealth } from '@/lib/communication-health'

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  failed: { label: 'נכשל', tone: 'bg-red-100 text-red-800' },
  bounced: { label: 'חזר', tone: 'bg-red-100 text-red-800' },
  pending: { label: 'בניסיון חוזר', tone: 'bg-amber-100 text-amber-900' },
}

const RUNG_LABEL = ['', 'תזכורת ראשונה', 'תזכורת שנייה', 'הועבר אליך']

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Tile({ label, value, tone = 'text-stone-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`tnum text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  )
}

/**
 * "בריאות תקשורת": is the site's mail going out and arriving, what is stuck
 * with a supplier, and who cannot be reached. Problems first, since they are
 * the only part that asks the operator to do something.
 */
export default function CommunicationAdmin({ health }: { health: CommunicationHealth }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const act = async (key: string, body: Record<string, unknown>, done: string) => {
    setBusy(key)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      setMessage({ ok: true, text: body.action === 'resend' && data.sent === false ? 'הוחזר לתור; השליחה תנוסה שוב בקרוב.' : done })
      router.refresh()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'הפעולה נכשלה' })
    } finally {
      setBusy(null)
    }
  }

  const { week } = health
  const suppliersUnreachable = health.unreachable.filter((row) => row.side === 'supplier')
  const carpentersUnreachable = health.unreachable.filter((row) => row.side === 'carpenter')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <Activity size={21} className="text-emerald-700" />
          בריאות תקשורת
        </h1>
        <p className="mt-1 text-sm text-stone-600">מיילים, תזכורות לספקים ומי שאי אפשר להשיג. שבעה ימים אחרונים.</p>
      </div>

      {!health.ready && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          תור המיילים עוד לא קיים במסד הנתונים הזה (מיגרציה 20261025120000). המיילים נשלחים ישירות, בלי מעקב.
        </p>
      )}
      {message && (
        <p role="status" className={`rounded-lg p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="נכנסו לתור" value={week.queued} />
        <Tile label="נשלחו" value={week.sent + week.delivered} />
        <Tile label="אושר שהגיעו" value={week.delivered} tone="text-emerald-700" />
        <Tile label="לא הגיעו" value={week.failed} tone={week.failed ? 'text-red-700' : 'text-stone-900'} />
        <Tile label="ממתינים לשליחה" value={week.pending} tone={week.pending ? 'text-amber-700' : 'text-stone-900'} />
      </section>
      {week.sent > 0 && week.delivered === 0 && (
        <p className="text-xs text-stone-500">אף מייל לא סומן &quot;הגיע&quot;: כנראה ה-webhook של Resend עוד לא מחובר.</p>
      )}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <MailWarning size={16} className="text-red-700" />
          מיילים שלא הגיעו ({health.problems.length})
        </h2>
        {health.problems.length === 0 ? (
          <p className="text-sm text-stone-500">אין. כל המיילים יצאו.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">מתי</th>
                  <th className="px-3 py-2 text-start font-semibold">אל</th>
                  <th className="px-3 py-2 text-start font-semibold">נושא</th>
                  <th className="px-3 py-2 text-start font-semibold">מצב</th>
                  <th className="px-3 py-2 text-start font-semibold">סיבה</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {health.problems.map((row) => {
                  const status = STATUS_LABEL[row.status] ?? { label: row.status, tone: 'bg-stone-100 text-stone-700' }
                  return (
                    <tr key={row.id} className="border-t border-stone-100 align-top">
                      <td className="tnum whitespace-nowrap px-3 py-2 text-stone-600">{when(row.createdAt)}</td>
                      <td className="px-3 py-2" dir="ltr">{row.to}</td>
                      <td className="max-w-[260px] truncate px-3 py-2" title={row.subject}>{row.subject}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                        <span className="tnum ms-1 text-xs text-stone-500">{row.attempts} ניסיונות</span>
                      </td>
                      <td className="max-w-[240px] px-3 py-2 text-xs text-stone-600">{row.lastError ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.suppressed ? (
                          <button
                            type="button"
                            disabled={busy === row.to}
                            onClick={() => act(row.to, { action: 'unsuppress', email: row.to }, 'החסימה בוטלה. אפשר לשלוח שוב.')}
                            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            בטל חסימה
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === row.id}
                            onClick={() => act(row.id, { action: 'resend', id: row.id }, 'נשלח שוב.')}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            <RotateCcw size={13} /> שלח שוב
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-900">מחכים לספק ({health.waiting.length})</h2>
        {health.waiting.length === 0 ? (
          <p className="text-sm text-stone-500">אין הזמנות או בקשות שמחכות לספק.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {health.waiting.map((row) => (
              <li key={`${row.subject}:${row.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="font-semibold">{row.label}</span>
                <span className="text-stone-600">
                  {row.carpenter} ← {row.supplier}
                </span>
                <span className="tnum text-stone-500">{row.workingHours} שעות עבודה</span>
                {row.rung > 0 && (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${row.rung === 3 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
                    {RUNG_LABEL[row.rung]}
                  </span>
                )}
                {row.contacted > 0 && <span className="text-xs text-stone-500">הנגרייה פנתה בטלפון/וואטסאפ {row.contacted}×</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-900">הודעות של נגריות שמחכות לתשובת ספק ({health.unanswered.length})</h2>
        {health.unanswered.length === 0 ? (
          <p className="text-sm text-stone-500">אין.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {health.unanswered.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 px-3 py-2 text-sm">
                <span className="font-semibold">{row.subject}</span>
                <span className="text-stone-600">
                  {row.carpenter} ← {row.supplier}
                </span>
                <span className="tnum text-stone-500">מאז {when(row.lastMessageAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-900">אי אפשר להשיג ({health.unreachable.length})</h2>
        {health.unreachable.length === 0 ? (
          <p className="text-sm text-stone-500">לכולם יש מייל וטלפון תקינים.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: 'ספקים', rows: suppliersUnreachable },
              { title: 'נגריות', rows: carpentersUnreachable },
            ].map((group) => (
              <div key={group.title} className="rounded-xl border border-stone-200 bg-white">
                <div className="border-b border-stone-100 px-3 py-2 text-xs font-bold text-stone-500">
                  {group.title} ({group.rows.length})
                </div>
                <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
                  {group.rows.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="truncate">{row.name}</span>
                      <span className="shrink-0 text-xs text-red-700">{row.problems.join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {health.suppressions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-stone-900">כתובות חסומות ({health.suppressions.length})</h2>
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {health.suppressions.map((row) => (
              <li key={row.email} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span dir="ltr" className="flex-1 truncate text-start">{row.email}</span>
                <span className="text-xs text-stone-500">{row.reason === 'complained' ? 'סומן כספאם' : 'חוזר'} · {when(row.createdAt)}</span>
                <button
                  type="button"
                  disabled={busy === row.email}
                  onClick={() => act(row.email, { action: 'unsuppress', email: row.email }, 'החסימה בוטלה.')}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  בטל חסימה
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
