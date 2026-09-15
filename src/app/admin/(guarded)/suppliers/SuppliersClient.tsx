'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Ban,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  ImagePlus,
  Link2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { formatIls } from '@/lib/vat'
import SupplierForm, { EMPTY_SUPPLIER, type SupplierFields } from './SupplierForm'

export interface SupplierRow {
  id: string
  company_name: string
  business_id: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  pickup_address: string | null
  min_order_value_excl_vat: number | null
  default_lead_time_days: number | null
  sells_note: string | null
  logo_url: string | null
  token: string | null
  status: string
  source: string
  created_at: string | null
  decided_at: string | null
  payment_terms: string[] | null
  terms_accepted_at: string | null
  offer_count: number
  order_count: number
}

/** The row as the form wants it: every field a string, nulls as empty. */
function toFields(row: SupplierRow): SupplierFields {
  return {
    company_name: row.company_name,
    business_id: row.business_id,
    contact_name: row.contact_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    city: row.city ?? '',
    address: row.address ?? '',
    pickup_address: row.pickup_address ?? '',
    min_order_value_excl_vat:
      row.min_order_value_excl_vat == null ? '' : String(row.min_order_value_excl_vat),
    default_lead_time_days:
      row.default_lead_time_days == null ? '' : String(row.default_lead_time_days),
    sells_note: row.sells_note ?? '',
  }
}

/**
 * The logo, or the company's initials.
 *
 * Logos arrive in every aspect ratio there is, so the box is fixed and the
 * image is contained inside it rather than filling it — a wide logo cropped to
 * a square reads as a broken image.
 */
function SupplierLogo({ row }: { row: SupplierRow }) {
  const [failed, setFailed] = useState(false)
  const initials = row.company_name.replace(/[^\p{L}\p{N}]/gu, ' ').trim().slice(0, 2)

  if (!row.logo_url || failed) {
    return (
      <div
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm font-bold text-stone-500"
      >
        {initials}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.logo_url}
      alt=""
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-lg border border-stone-200 bg-white object-contain p-1"
    />
  )
}

const SOURCE_LABEL: Record<string, string> = {
  seed: 'הוקם ידנית',
  admin: 'נפתח על ידך',
  self: 'נרשם לבד',
}

const LABEL: Record<string, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
  blocked: 'חסום',
}

const TONE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-stone-200 text-stone-600',
  blocked: 'bg-red-100 text-red-800',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * The approved supplier's way in, shown so it can be sent by hand — and opened
 * from here to see their console exactly as they do.
 */
function EntryLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const link =
    typeof window === 'undefined' ? `/supplier/enter/${token}` : `${window.location.origin}/supplier/enter/${token}`

  return (
    <div className="mt-3 rounded-lg bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-stone-700">
          <Link2 size={14} className="shrink-0 text-stone-400" />
          <span dir="ltr" className="min-w-0 break-all font-mono">/supplier/enter/{token}</span>
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            } catch {
              // Clipboard blocked; the link is on screen to select by hand.
            }
          }}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'הועתק' : 'העתק'}
        </button>
        <a
          href={`/supplier/enter/${token}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700"
        >
          <ExternalLink size={13} />
          פתח כספק
        </a>
      </div>
      <p className="mt-1.5 text-xs text-stone-500">
        זו הכניסה שלהם, ואין סיסמה מאחוריה — מי שמחזיק בקישור יכול לשנות את המחירים שלהם.
      </p>
    </div>
  )
}

interface CardActions {
  onDecide: (row: SupplierRow, status: string) => void
  onEdit: (id: string) => void
  onLogo: (id: string, file: File) => void
  onRemoveLogo: (id: string) => void
  onDelete: (row: SupplierRow) => void
}

/**
 * One supplier: a line with the essentials, opened to everything else.
 *
 * Closed, it answers "who, and is anything wrong" — status, how many products,
 * how many orders. Open, it holds contact details, terms, the entry link and
 * every action. Applications waiting on a decision start open, because that is
 * the work on this screen.
 */
function SupplierCard({
  row,
  busy,
  actions,
}: {
  row: SupplierRow
  busy: boolean
  actions: CardActions
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const pending = row.status === 'pending'
  const [open, setOpen] = useState(pending)

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${
        pending ? 'border-amber-300' : row.status === 'blocked' ? 'border-red-200' : 'border-stone-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-start hover:bg-stone-50"
      >
        <SupplierLogo row={row} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-stone-900">{row.company_name}</span>
          <span className="tnum block truncate text-xs text-stone-500">
            {row.city ?? 'ללא עיר'} · {row.offer_count} מוצרים · {row.order_count} הזמנות
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[row.status] ?? ''}`}>
          {LABEL[row.status] ?? row.status}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50 p-4">
          <p className="tnum text-sm text-stone-600">
            ח.פ {row.business_id}
            {SOURCE_LABEL[row.source] && ` · ${SOURCE_LABEL[row.source]}`}
            {' · '}נרשם {formatDate(row.created_at)}
            {row.decided_at && ` · הוחלט ${formatDate(row.decided_at)}`}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
            {row.contact_name && <span>{row.contact_name}</span>}
            {row.phone && (
              <a href={`tel:${row.phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone size={14} className="text-stone-400" />
                <span className="tnum">{row.phone}</span>
              </a>
            )}
            {row.email && (
              <a href={`mailto:${row.email}`} className="flex items-center gap-1.5 hover:underline">
                <Mail size={14} className="text-stone-400" />
                {row.email}
              </a>
            )}
          </div>

          {row.sells_note && (
            <p className="mt-3 rounded-lg bg-white p-3 text-sm text-stone-700">{row.sells_note}</p>
          )}

          {/* The terms a carpenter is held to. Blank ones are said out loud rather
              than left off, because an unset minimum is a surprise at checkout. */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <Truck size={13} />
              מינימום{' '}
              <span className="tnum font-semibold text-stone-700">
                {row.min_order_value_excl_vat ? formatIls(row.min_order_value_excl_vat) : 'לא הוגדר'}
              </span>
            </span>
            <span>
              אספקה{' '}
              <span className="font-semibold text-stone-700">
                {row.default_lead_time_days != null ? `${row.default_lead_time_days} ימים` : 'לא הוגדר'}
              </span>
            </span>
            <span>
              תשלום{' '}
              <span className="font-semibold text-stone-700">
                {row.payment_terms?.length ? row.payment_terms.join(' / ') : 'לא הוגדר'}
              </span>
            </span>
            {row.pickup_address && <span>איסוף מ{row.pickup_address}</span>}
            <span>
              תקנון{' '}
              <span className="font-semibold text-stone-700">
                {row.terms_accepted_at ? `אושר ${formatDate(row.terms_accepted_at)}` : 'עוד לא אישר'}
              </span>
            </span>
          </div>

          {row.status === 'approved' && row.token && <EntryLink token={row.token} />}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {pending && (
              <>
                <button
                  type="button"
                  onClick={() => actions.onDecide(row, 'approved')}
                  disabled={busy}
                  className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Check size={16} />
                  אשר ספק
                </button>
                <button
                  type="button"
                  onClick={() => actions.onDecide(row, 'rejected')}
                  disabled={busy}
                  className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
                >
                  <X size={16} />
                  דחה
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => actions.onEdit(row.id)}
              disabled={busy}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
            >
              <Pencil size={15} />
              ערוך
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) actions.onLogo(row.id, file)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
            >
              <ImagePlus size={15} />
              {row.logo_url ? 'החלף לוגו' : 'לוגו'}
            </button>
            {row.logo_url && (
              <button
                type="button"
                onClick={() => actions.onRemoveLogo(row.id)}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-stone-500 hover:bg-stone-100 disabled:opacity-50"
              >
                <Trash2 size={14} />
                הסר לוגו
              </button>
            )}

            {row.status === 'approved' && (
              <button
                type="button"
                onClick={() => actions.onDecide(row, 'blocked')}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-800 disabled:opacity-50"
              >
                <Ban size={15} />
                חסום
              </button>
            )}
            {row.status === 'blocked' && (
              <button
                type="button"
                onClick={() => actions.onDecide(row, 'approved')}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <RotateCcw size={15} />
                בטל חסימה
              </button>
            )}
            {row.status === 'rejected' && (
              <button
                type="button"
                onClick={() => actions.onDecide(row, 'pending')}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                החזר לבדיקה
              </button>
            )}

            <button
              type="button"
              onClick={() => actions.onDelete(row)}
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

export default function SuppliersClient({ rows }: { rows: SupplierRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // 'new' while opening a supplier, a supplier id while editing one.
  const [editing, setEditing] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Anything waiting on a decision floats to the top: it is the only part of
  // this screen with work on it.
  const { pending, decided } = useMemo(
    () => ({
      pending: rows.filter((row) => row.status === 'pending'),
      decided: rows.filter((row) => row.status !== 'pending'),
    }),
    [rows]
  )

  const request = async (id: string, url: string, init: RequestInit, fallback: string) => {
    setBusy(id)
    setMessage(null)
    try {
      const response = await fetch(url, init)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || fallback)
      router.refresh()
      return true
    } catch (err) {
      setMessage(err instanceof Error ? err.message : fallback)
      return false
    } finally {
      setBusy(null)
    }
  }

  const save = async (fields: SupplierFields) => {
    const creating = editing === 'new'
    setBusy(editing)
    setFormError(null)
    try {
      const response = await fetch('/api/admin/suppliers', {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creating ? fields : { id: editing, ...fields }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השמירה נכשלה')
      setEditing(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  const actions: CardActions = {
    onEdit: (id) => {
      setEditing(id)
      setFormError(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onLogo: (id, file) => {
      const data = new FormData()
      data.append('id', id)
      data.append('file', file)
      void request(id, '/api/admin/suppliers', { method: 'PATCH', body: data }, 'ההעלאה נכשלה')
    },
    onRemoveLogo: (id) =>
      void request(
        id,
        '/api/admin/suppliers',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, logo_url: null }),
        },
        'ההסרה נכשלה'
      ),
    onDecide: (row, status) => {
      if (
        status === 'blocked' &&
        !confirm(
          `לחסום את ${row.company_name}?\nהמוצרים שלו ייעלמו מהקטלוג והוא לא יוכל להיכנס. שום דבר לא נמחק, ואפשר לבטל בכל רגע.`
        )
      ) {
        return
      }
      void request(
        row.id,
        '/api/admin/suppliers',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, status }),
        },
        'הפעולה נכשלה'
      )
    },
    onDelete: (row) => {
      if (
        !confirm(
          `למחוק לצמיתות את ${row.company_name}?\n` +
            `${row.offer_count} המחירים שלו יימחקו, ומוצרים שרק הוא מוכר ייצאו מהקטלוג. אי אפשר לבטל.\n\n` +
            'אם רק רוצים לעצור אותו — עדיף לחסום.'
        )
      ) {
        return
      }
      void request(row.id, `/api/admin/suppliers?id=${row.id}`, { method: 'DELETE' }, 'המחיקה נכשלה')
    },
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">ספקים</h1>
          <p className="mt-1 text-sm text-stone-600">
            ספק נרשם דרך <span className="font-mono text-xs">/supplier/join</span> ומחכה לאישור שלך — או
            שאתה פותח אותו בעצמך, וזה כבר מאושר. לחיצה על ספק פותחת את כל הפרטים.
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={() => {
              setEditing('new')
              setFormError(null)
            }}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            ספק חדש
          </button>
        )}
      </div>

      {editing !== null && (
        <SupplierForm
          // Remounts when the target changes, so the fields never carry over
          // from the supplier you were editing a moment ago.
          key={editing}
          mode={editing === 'new' ? 'create' : 'edit'}
          initial={
            editing === 'new' ? EMPTY_SUPPLIER : toFields(rows.find((row) => row.id === editing)!)
          }
          busy={busy === editing}
          error={formError}
          onSubmit={save}
          onCancel={() => {
            setEditing(null)
            setFormError(null)
          }}
        />
      )}

      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-stone-900">ממתינים לאישור ({pending.length})</h2>
          {pending.map((row) => (
            <SupplierCard key={row.id} row={row} busy={busy === row.id} actions={actions} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-900">
          {pending.length > 0 ? `כל השאר (${decided.length})` : `ספקים (${decided.length})`}
        </h2>
        {decided.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            אין עדיין ספקים.
          </p>
        ) : (
          decided.map((row) => (
            <SupplierCard key={row.id} row={row} busy={busy === row.id} actions={actions} />
          ))
        )}
      </section>
    </div>
  )
}
