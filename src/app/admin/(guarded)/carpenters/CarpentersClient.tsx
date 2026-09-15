'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Ban,
  Check,
  ChevronDown,
  Copy,
  Dices,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react'

export interface CarpenterRow {
  id: string
  token: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  created_at: string
  is_active: boolean
  source: string
  terms_accepted_at: string | null
  terms_version: string | null
  marketing_consent: boolean
  orders: number
}

export interface DrawRow {
  id: string
  carpenter_id: string | null
  winner_name: string
  winner_email: string | null
  prize: string | null
  pool_size: number
  included_test: boolean
  drawn_at: string
  notified_at: string | null
}

const SAMPLE = 'נגריית אבו חצירא, יוסי, 0501234567, אשדוד\nרהיטי כהן, , 052-9876543, חיפה'
const PAGE = 100

type Filter = 'all' | 'active' | 'blocked' | 'marketing' | 'ordered'

function isTest(name: string): boolean {
  return name.includes('ניסיון')
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function call(url: string, init: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
  return data
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-800">{children}</dd>
    </div>
  )
}

/**
 * One carpenter: a single line until it is opened.
 *
 * Four hundred carpenters as full cards is a page nobody can scan. Closed, a
 * row says who it is and whether anything needs attention; open, it holds every
 * detail and the actions — including the two that cannot be undone by accident.
 */
function Row({
  row,
  open,
  busy,
  onToggle,
  onBlock,
  onDelete,
}: {
  row: CarpenterRow
  open: boolean
  busy: boolean
  onToggle: () => void
  onBlock: (row: CarpenterRow) => void
  onDelete: (row: CarpenterRow) => void
}) {
  const [copied, setCopied] = useState(false)
  const link = typeof window === 'undefined' ? `/o/${row.token}` : `${window.location.origin}/o/${row.token}`

  return (
    <div className={`border-b border-stone-100 last:border-b-0 ${row.is_active ? '' : 'bg-red-50/40'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-stone-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`truncate font-semibold ${row.is_active ? 'text-stone-900' : 'text-stone-500 line-through'}`}>
              {row.business_name}
            </span>
            {!row.is_active && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">חסום</span>
            )}
            {isTest(row.business_name) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">ניסיון</span>
            )}
            {row.source === 'self' && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">נרשם לבד</span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {row.city ?? 'ללא עיר'}
            {row.contact_name && ` · ${row.contact_name}`}
          </span>
        </span>
        <span className="tnum shrink-0 text-end text-xs text-stone-500">
          {row.orders > 0 ? `${row.orders} הזמנות` : 'לא הזמין'}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <Detail label="טלפון">
              {row.phone ? (
                <a href={`tel:${row.phone}`} className="tnum flex items-center gap-1.5 hover:underline">
                  <Phone size={13} className="text-stone-400" />
                  {row.phone}
                </a>
              ) : (
                '—'
              )}
            </Detail>
            <Detail label="מייל">
              {row.email ? (
                <a href={`mailto:${row.email}`} className="flex min-w-0 items-center gap-1.5 hover:underline">
                  <Mail size={13} className="shrink-0 text-stone-400" />
                  <span className="truncate">{row.email}</span>
                </a>
              ) : (
                '—'
              )}
            </Detail>
            <Detail label="כתובת">
              {row.address || row.city ? (
                <span className="flex items-start gap-1.5">
                  <MapPin size={13} className="mt-1 shrink-0 text-stone-400" />
                  {[row.address, row.city].filter(Boolean).join(', ')}
                </span>
              ) : (
                '—'
              )}
            </Detail>
            <Detail label="נוסף">{formatDate(row.created_at)}</Detail>
            <Detail label="פתח לראשונה / אחרונה">
              {formatDate(row.first_seen_at)} / {formatDate(row.last_seen_at)}
            </Detail>
            <Detail label="תקנון">
              {row.terms_accepted_at ? `אושר ${formatDate(row.terms_accepted_at)}` : 'עוד לא אישר'}
              {row.marketing_consent ? ' · מסכים לדיוור' : ''}
            </Detail>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5">
            <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs text-stone-500">
              /o/{row.token}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                } catch {
                  // Clipboard blocked; the link is on screen.
                }
              }}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-700"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'הועתק' : 'העתק קישור'}
            </button>
            <a
              href={`/o/${row.token}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-700"
            >
              <ExternalLink size={13} />
              פתח כנגר
            </a>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onBlock(row)}
              disabled={busy}
              className={`flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold disabled:opacity-50 ${
                row.is_active
                  ? 'border border-red-300 bg-white text-red-800'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {row.is_active ? <Ban size={15} /> : <RotateCcw size={15} />}
              {row.is_active ? 'חסום' : 'בטל חסימה'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(row)}
              disabled={busy}
              className="ms-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={15} />
              מחק מהאתר
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The draw.
 *
 * The server picks — from the database, with a cryptographic random number —
 * and the screen only plays the moment: names flicker for a second and a half,
 * then land on the one that was actually drawn. Telling the winner is a second,
 * deliberate tap, so the prize can be settled before anything reaches an inbox.
 */
function Raffle({
  rows,
  draws,
  onClose,
}: {
  rows: CarpenterRow[]
  draws: DrawRow[]
  onClose: () => void
}) {
  const router = useRouter()
  const [prize, setPrize] = useState('')
  const [includeTest, setIncludeTest] = useState(false)
  const [onlyMarketing, setOnlyMarketing] = useState(false)
  const [rolling, setRolling] = useState<string | null>(null)
  const [winner, setWinner] = useState<DrawRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notified, setNotified] = useState<Record<string, boolean>>({})
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  const pool = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.is_active &&
          (includeTest || !isTest(row.business_name)) &&
          (!onlyMarketing || row.marketing_consent)
      ),
    [rows, includeTest, onlyMarketing]
  )

  const draw = async () => {
    setBusy(true)
    setError(null)
    setWinner(null)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!still && pool.length > 1) {
      timer.current = setInterval(() => {
        setRolling(pool[Math.floor(Math.random() * pool.length)].business_name)
      }, 70)
    }

    try {
      const [data] = await Promise.all([
        call('/api/admin/raffle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prize, include_test: includeTest, only_marketing: onlyMarketing }),
        }),
        new Promise((resolve) => setTimeout(resolve, still ? 0 : 1500)),
      ])
      setWinner(data.draw as DrawRow)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההגרלה נכשלה')
    } finally {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
      setRolling(null)
      setBusy(false)
    }
  }

  const notify = async (draw: DrawRow) => {
    if (!confirm(`לשלוח הודעת זכייה במייל ל-${draw.winner_name}?`)) return
    setBusy(true)
    setError(null)
    try {
      await call('/api/admin/raffle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draw.id }),
      })
      setNotified((prev) => ({ ...prev, [draw.id]: true }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const wasNotified = (draw: DrawRow) => Boolean(draw.notified_at) || notified[draw.id]

  return (
    <section className="rounded-xl border border-emerald-300 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-stone-900">
          <Dices size={19} className="text-emerald-700" />
          הגרלה בין הנגריות
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">הפרס (לא חובה)</span>
          <input
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="למשל: דלי דבק PUR במתנה"
            className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={onlyMarketing}
            onChange={(e) => setOnlyMarketing(e.target.checked)}
            className="h-4 w-4 accent-emerald-700"
          />
          רק מי שהסכים לקבל דיוור
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={includeTest}
            onChange={(e) => setIncludeTest(e.target.checked)}
            className="h-4 w-4 accent-emerald-700"
          />
          כולל נגריות ״ניסיון״
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={draw}
          disabled={busy || pool.length === 0}
          className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-6 font-bold text-white disabled:opacity-50"
        >
          <Dices size={18} />
          {busy && rolling !== null ? 'מגריל…' : 'הגרל עכשיו'}
        </button>
        <span className="tnum text-sm text-stone-600">{pool.length} נגריות בהגרלה</span>
      </div>

      {(rolling || winner) && (
        <div
          aria-live="polite"
          className={`mt-4 rounded-xl p-5 text-center ${winner ? 'bg-emerald-50' : 'bg-stone-100'}`}
        >
          {winner ? (
            <>
              <Trophy size={30} className="mx-auto text-emerald-700" />
              <p className="mt-2 text-xs font-semibold text-emerald-800">הזוכה</p>
              <p className="text-2xl font-bold text-balance text-stone-900">{winner.winner_name}</p>
              <p className="tnum mt-1 text-xs text-stone-500">
                נבחר מתוך {winner.pool_size} · {winner.winner_email ?? 'אין מייל — צריך להתקשר'}
              </p>
              {winner.prize && <p className="mt-2 font-semibold text-emerald-900">{winner.prize}</p>}
              {winner.winner_email && (
                <button
                  type="button"
                  onClick={() => notify(winner)}
                  disabled={busy || wasNotified(winner)}
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {wasNotified(winner) ? <Check size={16} /> : <Send size={16} />}
                  {wasNotified(winner) ? 'ההודעה נשלחה' : 'שלח הודעת זכייה במייל'}
                </button>
              )}
            </>
          ) : (
            <p className="text-xl font-bold text-stone-500">{rolling}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {draws.length > 0 && (
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-sm font-bold text-stone-900">הגרלות קודמות</p>
          <ul className="mt-2 divide-y divide-stone-100">
            {draws.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="tnum text-xs text-stone-500">{formatDate(item.drawn_at)}</span>
                <span className="font-semibold text-stone-900">{item.winner_name}</span>
                {item.prize && <span className="text-stone-600">{item.prize}</span>}
                <span className="tnum text-xs text-stone-400">מתוך {item.pool_size}</span>
                <span className="ms-auto">
                  {wasNotified(item) ? (
                    <span className="text-xs font-semibold text-emerald-700">נשלחה הודעה</span>
                  ) : item.winner_email ? (
                    <button
                      type="button"
                      onClick={() => notify(item)}
                      disabled={busy}
                      className="text-xs font-semibold text-stone-700 underline disabled:opacity-50"
                    >
                      שלח הודעה
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400">אין מייל</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function CarpentersClient({ rows, draws }: { rows: CarpenterRow[]; draws: DrawRow[] }) {
  const router = useRouter()
  const [panel, setPanel] = useState<'none' | 'import' | 'raffle'>('none')
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((row) => row.is_active).length,
      blocked: rows.filter((row) => !row.is_active).length,
      marketing: rows.filter((row) => row.marketing_consent).length,
      ordered: rows.filter((row) => row.orders > 0).length,
    }),
    [rows]
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return rows.filter((row) => {
      if (filter === 'active' && !row.is_active) return false
      if (filter === 'blocked' && row.is_active) return false
      if (filter === 'marketing' && !row.marketing_consent) return false
      if (filter === 'ordered' && row.orders === 0) return false
      if (!q) return true
      if (digits.length >= 3 && row.phone?.replace(/\D/g, '').includes(digits)) return true
      return [row.business_name, row.contact_name, row.city, row.email].some((field) =>
        field?.toLowerCase().includes(q)
      )
    })
  }, [rows, query, filter])

  const runImport = async () => {
    setImporting(true)
    setMessage(null)
    setResult(null)
    try {
      const data = await call('/api/admin/carpenters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      setResult(
        `נוספו ${data.inserted}, עודכנו ${data.updated}, דולגו ${data.skipped}` +
          (data.duplicates ? `, כפילויות ברשימה ${data.duplicates}` : '')
      )
      setText('')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'הייבוא נכשל')
    } finally {
      setImporting(false)
    }
  }

  /** Phone plus each carpenter's own link, one row per message to send. */
  const copyLinks = async () => {
    const origin = window.location.origin
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

  const block = async (row: CarpenterRow) => {
    const blocking = row.is_active
    if (
      blocking &&
      !confirm(`לחסום את ${row.business_name}?\nלא יראו מחירים ולא יוכלו להזמין. אפשר לבטל בכל רגע.`)
    ) {
      return
    }
    setBusyId(row.id)
    setMessage(null)
    try {
      await call('/api/admin/carpenters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, is_active: !blocking }),
      })
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (row: CarpenterRow) => {
    const ok = confirm(
      `למחוק לצמיתות את ${row.business_name}?\n` +
        (row.orders > 0 ? `ההזמנות שלו (${row.orders}) יישארו בהיסטוריה. ` : '') +
        'הקישור האישי יפסיק לעבוד. אי אפשר לבטל.\n\nאם רק רוצים לעצור אותו — עדיף לחסום.'
    )
    if (!ok) return
    setBusyId(row.id)
    setMessage(null)
    try {
      await call(`/api/admin/carpenters?id=${row.id}`, { method: 'DELETE' })
      setOpenId(null)
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'המחיקה נכשלה')
    } finally {
      setBusyId(null)
    }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'active', label: 'פעילות' },
    { key: 'ordered', label: 'הזמינו' },
    { key: 'marketing', label: 'מסכימות לדיוור' },
    { key: 'blocked', label: 'חסומות' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">נגריות</h1>
          <p className="tnum text-sm text-stone-600">
            {counts.active} פעילות · {counts.ordered} הזמינו · {rows.filter((row) => row.first_seen_at).length} פתחו קישור
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === 'raffle' ? 'none' : 'raffle')}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            <Dices size={16} />
            הגרלה
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}
            className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800"
          >
            <Upload size={16} />
            ייבוא
          </button>
          <button
            type="button"
            onClick={copyLinks}
            disabled={rows.length === 0}
            className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 disabled:opacity-40"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'הועתק' : 'CSV לשליחה'}
          </button>
        </div>
      </div>

      {panel === 'raffle' && <Raffle rows={rows} draws={draws} onClose={() => setPanel('none')} />}

      {panel === 'import' && (
        <section className="rounded-xl border border-stone-300 bg-white p-5">
          <h2 className="font-bold text-stone-900">ייבוא רשימה</h2>
          <p className="mt-1 text-sm text-stone-600">
            שורה לכל נגרייה: <span className="font-mono text-xs">שם, איש קשר, טלפון, עיר</span>. רק השם
            חובה. ייבוא חוזר מעדכן לפי טלפון ולא מכפיל.
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
              disabled={importing || !text.trim()}
              className="h-11 rounded-lg bg-stone-900 px-5 font-semibold text-white disabled:opacity-50"
            >
              {importing ? 'מייבא…' : 'ייבא'}
            </button>
            <button
              type="button"
              onClick={() => setPanel('none')}
              className="h-11 rounded-lg px-4 text-sm text-stone-600 hover:bg-stone-100"
            >
              ביטול
            </button>
            {result && <span className="text-sm font-medium text-emerald-700">{result}</span>}
          </div>
        </section>
      )}

      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      <div className="space-y-2">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
            style={{ insetInlineStart: '0.75rem' }}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="חפש שם, עיר, טלפון או מייל"
            aria-label="חיפוש נגריות"
            className="h-11 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilter(item.key)
                setLimit(PAGE)
              }}
              aria-pressed={filter === item.key}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                filter === item.key
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {item.label}
              <span className="tnum text-xs opacity-60">{counts[item.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
          עדיין אין נגריות. אפשר לייבא רשימה או לחכות להרשמות.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
          אין נגריות שמתאימות לחיפוש.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {shown.slice(0, limit).map((row) => (
            <Row
              key={row.id}
              row={row}
              open={openId === row.id}
              busy={busyId === row.id}
              onToggle={() => setOpenId(openId === row.id ? null : row.id)}
              onBlock={block}
              onDelete={remove}
            />
          ))}
          {shown.length > limit && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE)}
              className="tnum w-full border-t border-stone-200 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              הצג עוד ({shown.length - limit} נוספות)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
