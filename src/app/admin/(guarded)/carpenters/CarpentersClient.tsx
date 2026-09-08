'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Row {
  id: string
  token: string
  business_name: string
  contact_name: string | null
  phone: string | null
  city: string | null
  first_seen_at: string | null
  is_active: boolean
  source: string
}

const SAMPLE = 'נגריית אבו חצירא, יוסי, 0501234567, אשדוד\nרהיטי כהן, , 052-9876543, חיפה'

export default function CarpentersClient({ rows, opened }: { rows: Row[]; opened: number }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const runImport = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/admin/carpenters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'הייבוא נכשל')
      setResult(
        `נוספו ${data.inserted}, עודכנו ${data.updated}, דולגו ${data.skipped}` +
          (data.duplicates ? `, כפילויות ברשימה ${data.duplicates}` : '')
      )
      setText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הייבוא נכשל')
    } finally {
      setBusy(false)
    }
  }

  /**
   * The list is only useful if it can be merged into a WhatsApp send, so the
   * export is phone plus that carpenter's own link — one row per message.
   */
  const copyLinks = async () => {
    const csv = [
      'business_name,phone,link',
      ...rows
        .filter((row) => row.is_active)
        .map((row) => `"${row.business_name}",${row.phone ?? ''},${origin}/o/${row.token}`),
    ].join('\n')
    await navigator.clipboard.writeText(csv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 className="text-xl font-bold text-stone-900">נגריות</h1>
        <p className="text-sm text-stone-600">
          {rows.length} ברשימה · {opened} פתחו לינק אי פעם
        </p>
      </div>

      <section className="rounded-xl border border-stone-300 bg-white p-5">
        <h2 className="font-bold text-stone-900">ייבוא רשימה</h2>
        <p className="mt-1 text-sm text-stone-600">
          שורה לכל נגרייה: <span className="font-mono text-xs">שם, איש קשר, טלפון, עיר</span>.
          רק השם חובה. ייבוא חוזר מעדכן לפי טלפון ולא מכפיל.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          dir="rtl"
          placeholder={SAMPLE}
          className="mt-3 w-full rounded-lg border border-stone-300 p-3 font-mono text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runImport}
            disabled={busy || !text.trim()}
            className="h-11 rounded-lg bg-stone-900 px-5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'מייבא…' : 'ייבא'}
          </button>
          {result && <span className="text-sm font-medium text-emerald-700">{result}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
          <h2 className="font-bold text-stone-900">הלינקים האישיים</h2>
          <button
            type="button"
            onClick={copyLinks}
            disabled={rows.length === 0}
            className="h-10 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-800 disabled:opacity-40"
          >
            {copied ? '✓ הועתק' : 'העתק CSV לשליחה'}
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-stone-600">עדיין אין נגריות. ייבא רשימה למעלה.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="p-3 text-start font-medium">נגרייה</th>
                  <th className="p-3 text-start font-medium">טלפון</th>
                  <th className="p-3 text-start font-medium">עיר</th>
                  <th className="p-3 text-start font-medium">פתח</th>
                  <th className="p-3 text-start font-medium">לינק</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="p-3 font-medium text-stone-900">
                      {row.business_name}
                      {row.source === 'self' && (
                        <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          נרשם לבד
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums text-stone-600">{row.phone ?? '—'}</td>
                    <td className="p-3 text-stone-600">{row.city ?? '—'}</td>
                    <td className="p-3">
                      {row.first_seen_at ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          כן
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <a
                        href={`/o/${row.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-stone-500 underline underline-offset-2"
                      >
                        /o/{row.token.slice(0, 8)}…
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="border-t border-stone-200 p-3 text-xs text-stone-500">
                מוצגות 200 מתוך {rows.length}. הכפתור מעתיק את כולן.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
