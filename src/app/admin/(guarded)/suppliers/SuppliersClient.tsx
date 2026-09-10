'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, RotateCcw, Phone, Mail, Plus, Pencil, Truck } from 'lucide-react'
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
  status: string
  source: string
  created_at: string | null
  decided_at: string | null
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

const SOURCE_LABEL: Record<string, string> = {
  seed: 'הוקם ידנית',
  admin: 'נפתח על ידך',
  self: 'נרשם לבד',
}

const LABEL: Record<string, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
}

const TONE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-stone-200 text-stone-600',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function SupplierCard({
  row,
  busy,
  onDecide,
  onEdit,
}: {
  row: SupplierRow
  busy: boolean
  onDecide: (id: string, status: string) => void
  onEdit: (id: string) => void
}) {
  const pending = row.status === 'pending'

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        pending ? 'border-amber-300' : 'border-stone-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-stone-900">{row.company_name}</p>
          <p className="tnum text-sm text-stone-500">
            ח.פ {row.business_id}
            {row.city && ` · ${row.city}`}
            {SOURCE_LABEL[row.source] && ` · ${SOURCE_LABEL[row.source]}`}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[row.status]}`}>
          {LABEL[row.status] ?? row.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
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
        <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{row.sells_note}</p>
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
        {row.pickup_address && <span>איסוף מ{row.pickup_address}</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(row.id)}
          disabled={busy}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
        >
          <Pencil size={15} />
          ערוך
        </button>
        {pending ? (
          <>
            <button
              type="button"
              onClick={() => onDecide(row.id, 'approved')}
              disabled={busy}
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check size={16} />
              אשר ספק
            </button>
            <button
              type="button"
              onClick={() => onDecide(row.id, 'rejected')}
              disabled={busy}
              className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
            >
              <X size={16} />
              דחה
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-stone-500">
              הוחלט {formatDate(row.decided_at)} · נרשם {formatDate(row.created_at)}
            </span>
            <button
              type="button"
              onClick={() => onDecide(row.id, 'pending')}
              disabled={busy}
              className="ms-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-stone-500 hover:bg-stone-100 disabled:opacity-50"
            >
              <RotateCcw size={14} />
              החזר לבדיקה
            </button>
          </>
        )}
      </div>
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

  const decide = async (id: string, status: string) => {
    setBusy(id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">ספקים</h1>
          <p className="mt-1 text-sm text-stone-600">
            ספק נרשם דרך <span className="font-mono text-xs">/supplier/join</span> ומחכה לאישור
            שלך — או שאתה פותח אותו בעצמך, וזה כבר מאושר.
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
            editing === 'new'
              ? EMPTY_SUPPLIER
              : toFields(rows.find((row) => row.id === editing)!)
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
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-stone-900">
            ממתינים לאישור ({pending.length})
          </h2>
          {pending.map((row) => (
            <SupplierCard
              key={row.id}
              row={row}
              busy={busy === row.id}
              onDecide={decide}
              onEdit={setEditing}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-stone-900">
          {pending.length > 0 ? `כל השאר (${decided.length})` : `ספקים (${decided.length})`}
        </h2>
        {decided.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            אין עדיין ספקים.
          </p>
        ) : (
          decided.map((row) => (
            <SupplierCard
              key={row.id}
              row={row}
              busy={busy === row.id}
              onDecide={decide}
              onEdit={setEditing}
            />
          ))
        )}
      </section>
    </div>
  )
}
