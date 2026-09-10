'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Truck, PackageCheck, X } from 'lucide-react'
import { formatIls, round2 } from '@/lib/vat'
import { statusInfo } from '@/lib/order-status'
import EmailTestButton from './EmailTestButton'

interface Line {
  id: string
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
}

interface Order {
  id: string
  order_number: string
  created_at: string | null
  status: string | null
  customer_name: string
  business_name: string | null
  customer_phone: string
  payment_method: string | null
  subtotal_excl_vat: number
  confirmed_subtotal_excl_vat: number | null
  confirmed_at: string | null
  supplier_note: string | null
  carpenter_id: string | null
  order_items: Line[]
}

const NEXT_STEPS: { status: string; label: string; Icon: typeof Check }[] = [
  { status: 'processing', label: 'בהכנה', Icon: PackageCheck },
  { status: 'shipped', label: 'יצא לאספקה', Icon: Truck },
  { status: 'delivered', label: 'סופק', Icon: Check },
  { status: 'cancelled', label: 'בטל', Icon: X },
]

function Row({
  order,
  expanded,
  busy,
  amount,
  note,
  onToggle,
  onAmount,
  onNote,
  onPatch,
}: {
  order: Order
  expanded: boolean
  busy: boolean
  amount: string | undefined
  note: string | undefined
  onToggle: (id: string) => void
  onAmount: (id: string, value: string) => void
  onNote: (id: string, value: string) => void
  onPatch: (id: string, body: Record<string, unknown>) => void
}) {
  const status = statusInfo(order.status)
  const submitted = Number(order.subtotal_excl_vat)
  const confirmed =
    order.confirmed_subtotal_excl_vat != null
      ? Number(order.confirmed_subtotal_excl_vat)
      : null
  const differs = confirmed != null && round2(confirmed) !== round2(submitted)

  return (
    <div className="border-b border-stone-200 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(order.id)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-start hover:bg-stone-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm font-semibold text-stone-900">
              {order.order_number}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
              {status.label}
            </span>
            {order.carpenter_id && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                מלינק
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-600">
            {order.business_name || order.customer_name} · {order.customer_phone}
            {order.created_at &&
              ` · ${new Date(order.created_at).toLocaleDateString('he-IL')}`}
          </p>
        </div>

        <div className="shrink-0 text-end">
          <p className="tnum font-bold text-stone-900">
            {formatIls(confirmed ?? submitted)}
          </p>
          <p className="text-xs text-stone-400">
            {confirmed != null ? 'מאושר' : 'הוזמן'} · {order.order_items.length} שורות
          </p>
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-stone-200 bg-stone-50 p-4">
          <table className="w-full text-sm">
            <tbody>
              {order.order_items.map((line) => (
                <tr key={line.id} className="border-b border-stone-200 last:border-b-0">
                  <td className="py-1.5 font-medium text-stone-900">{line.product_name_he}</td>
                  <td className="tnum py-1.5 text-stone-600">×{line.quantity}</td>
                  <td className="tnum py-1.5 text-stone-600">
                    {formatIls(Number(line.unit_price_excl_vat))}
                  </td>
                  <td className="tnum py-1.5 text-end font-semibold">
                    {formatIls(Number(line.line_total_excl_vat))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 text-sm">
            <span className="text-stone-600">
              הוזמן: <span className="tnum font-semibold">{formatIls(submitted)}</span>
            </span>
            {confirmed != null && (
              <span className={differs ? 'text-amber-800' : 'text-emerald-800'}>
                אושר: <span className="tnum font-semibold">{formatIls(confirmed)}</span>
                {differs && ' (שונה מהמוזמן)'}
              </span>
            )}
            {order.payment_method && (
              <span className="text-stone-600">תנאים: {order.payment_method}</span>
            )}
          </div>

          {order.supplier_note && (
            <p className="mt-2 rounded-lg bg-white p-2 text-sm text-stone-700">
              {order.supplier_note}
            </p>
          )}

          {/* Confirming is the point of this screen. The amount defaults to
              what was ordered but is editable, because the invoice is what
              counts and it often differs — a line out of stock, an adjusted
              quantity, a negotiated price. */}
          <div className="mt-4 rounded-lg border border-stone-300 bg-white p-3">
            <p className="text-sm font-semibold text-stone-900">
              {confirmed != null ? 'עדכן את הסכום המאושר' : 'אשר את ההזמנה'}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              הסכום שתאשר הוא הבסיס לעמלה — לא הסכום שהוזמן.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                inputMode="decimal"
                value={amount ?? String(confirmed ?? submitted)}
                onChange={(e) => onAmount(order.id, e.target.value)}
                aria-label="סכום מאושר ללא מע״מ"
                className="tnum h-11 w-32 rounded-lg border border-stone-300 px-3 text-center"
              />
              <span className="text-xs text-stone-500">₪ ללא מע״מ</span>
              <input
                value={note ?? order.supplier_note ?? ''}
                onChange={(e) => onNote(order.id, e.target.value)}
                placeholder="הערה (אם הסכום שונה)"
                aria-label="הערת ספק"
                className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onPatch(order.id, {
                    status: 'confirmed',
                    confirmed_subtotal_excl_vat:
                      amount ?? String(confirmed ?? submitted),
                    supplier_note: note ?? order.supplier_note ?? '',
                  })
                }
                className="flex h-11 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Check size={16} />
                {busy ? 'שומר…' : 'אשר'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {NEXT_STEPS.map(({ status: next, label, Icon }) => (
              <button
                key={next}
                type="button"
                disabled={busy || order.status === next}
                onClick={() => onPatch(order.id, { status: next })}
                className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium disabled:opacity-40 ${
                  next === 'cancelled'
                    ? 'border-red-200 text-red-700'
                    : 'border-stone-300 text-stone-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'העדכון נכשל')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'העדכון נכשל')
    } finally {
      setBusy(null)
    }
  }

  const open = orders.filter((o) => o.status === 'pending')
  const rest = orders.filter((o) => o.status !== 'pending')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-900">הזמנות</h1>
        <p className="text-sm text-stone-600">
          {open.length} ממתינות לאישור · {orders.length} בסך הכול
        </p>
        <div className="mt-3">
          <EmailTestButton />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {orders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
          <p className="font-semibold text-stone-900">אין הזמנות עדיין</p>
          <p className="mt-1 text-sm text-stone-600">
            הזמנה שתישלח מדף הצעה או מהקטלוג תופיע כאן.
          </p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-amber-300 bg-white">
              <h2 className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900">
                ממתינות לאישור שלך
              </h2>
              {open.map((order) => (
                <Row
                  key={order.id}
                  order={order}
                  expanded={openId === order.id}
                  busy={busy === order.id}
                  amount={amounts[order.id]}
                  note={notes[order.id]}
                  onToggle={(id) => setOpenId(openId === id ? null : id)}
                  onAmount={(id, v) => setAmounts((p) => ({ ...p, [id]: v }))}
                  onNote={(id, v) => setNotes((p) => ({ ...p, [id]: v }))}
                  onPatch={patch}
                />
              ))}
            </section>
          )}

          {rest.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700">
                בטיפול והושלמו
              </h2>
              {rest.map((order) => (
                <Row
                  key={order.id}
                  order={order}
                  expanded={openId === order.id}
                  busy={busy === order.id}
                  amount={amounts[order.id]}
                  note={notes[order.id]}
                  onToggle={(id) => setOpenId(openId === id ? null : id)}
                  onAmount={(id, v) => setAmounts((p) => ({ ...p, [id]: v }))}
                  onNote={(id, v) => setNotes((p) => ({ ...p, [id]: v }))}
                  onPatch={patch}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
