'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MapPin, MessageCircle, MessageSquare, Phone, Send, PackageCheck, Inbox } from 'lucide-react'
import { formatIls, withVat } from '@/lib/vat'
import { statusInfo } from '@/lib/order-status'
import { callApi, jsonInit, whatsappLink, type SupplierOrder, type SupplierQuestion } from '../types'
import type { Notify } from '../SupplierApp'

type Filter = 'pending' | 'active' | 'done' | 'all'
type Action = 'confirm' | 'reject' | 'prepare' | 'ship' | 'deliver'

const FILTERS: { key: Filter; label: string; match: (status: string) => boolean }[] = [
  { key: 'pending', label: 'ממתינות לאישור', match: (s) => s === 'pending' },
  { key: 'active', label: 'בטיפול', match: (s) => ['confirmed', 'processing', 'shipped'].includes(s) },
  { key: 'done', label: 'הושלמו', match: (s) => ['delivered', 'cancelled'].includes(s) },
  { key: 'all', label: 'הכל', match: () => true },
]

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * One incoming order, with the next step as its own button.
 *
 * Confirming is one tap for "yes, all of it"; behind "יש שינוי" the supplier
 * can mark lines it cannot supply (the amount follows), change the amount, set
 * a delivery date and add a note. "לא יכול לספק" rejects with a reason.
 * After that the card offers only the step that comes next, so there is never a
 * choice to make about which button applies.
 */
function OrderCard({
  order,
  busy,
  onAction,
}: {
  order: SupplierOrder
  busy: boolean
  onAction: (order: SupplierOrder, action: Action, extra?: Record<string, unknown>) => Promise<boolean>
}) {
  const [changing, setChanging] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [amount, setAmount] = useState(String(order.total))
  const [deliveryOn, setDeliveryOn] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')

  const toggleMissing = (lineId: string) => {
    const next = missing.includes(lineId) ? missing.filter((id) => id !== lineId) : [...missing, lineId]
    setMissing(next)
    const total = order.lines.filter((line) => !next.includes(line.id)).reduce((sum, line) => sum + line.lineTotal, 0)
    setAmount(String(Math.round(total * 100) / 100))
  }

  const info = statusInfo(order.status)
  const whatsapp = whatsappLink(
    order.phone,
    `שלום, לגבי הזמנה ${order.orderNumber} בשוק הנגרים`
  )
  const mapsLink = order.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`
    : null

  const confirm = async () => {
    const ok = await onAction(order, 'confirm', {
      confirmed_subtotal_excl_vat: changing ? amount : undefined,
      unavailable_lines: changing ? missing : [],
      expected_delivery_on: changing && deliveryOn ? deliveryOn : undefined,
      supplier_note: note,
    })
    if (ok) setChanging(false)
  }

  const reject = async () => {
    const ok = await onAction(order, 'reject', { reason })
    if (ok) setRejecting(false)
  }

  return (
    <article
      className={`rounded-xl border bg-white p-4 ${
        order.status === 'pending' ? 'border-amber-300 shadow-sm' : 'border-stone-200'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-stone-900">{order.buyer}</h3>
          <p className="tnum text-xs text-stone-500">
            {order.orderNumber} · {formatDate(order.createdAt)}
            {order.contactName && ` · ${order.contactName}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${info.className}`}>
          {info.label}
        </span>
      </header>

      {/* How to reach them — the first thing a supplier needs from an order. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700"
          >
            <Phone size={15} />
            חיוג
          </a>
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800"
          >
            <MessageCircle size={15} />
            וואטסאפ
          </a>
        )}
        {!order.split && (
          <Link
            href={`/supplier/messages/new?order=${order.id}`}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700"
          >
            <MessageSquare size={15} />
            הודעה
          </Link>
        )}
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 min-w-0 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm text-stone-700"
          >
            <MapPin size={15} className="shrink-0" />
            <span className="truncate">{order.address}</span>
          </a>
        )}
      </div>

      {order.paymentTerms && (
        <p className="mt-2 text-sm text-stone-600">
          תנאי תשלום מבוקשים: <strong className="text-stone-900">{order.paymentTerms}</strong>
        </p>
      )}
      {order.notes && (
        <p className="mt-2 rounded-lg bg-stone-50 p-2.5 text-sm text-stone-700">{order.notes}</p>
      )}

      <ul className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
        {order.lines.map((line) => (
          <li key={line.id} className={`flex justify-between gap-3 py-2 text-sm ${missing.includes(line.id) ? 'opacity-50' : ''}`}>
            {changing && order.status === 'pending' && (
              <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-stone-600">
                <input
                  type="checkbox"
                  checked={missing.includes(line.id)}
                  onChange={() => toggleMissing(line.id)}
                  className="h-5 w-5 accent-amber-600"
                />
                חסר
              </label>
            )}
            <span className="min-w-0 flex-1">
              <span className={`block font-medium text-stone-900 ${missing.includes(line.id) ? 'line-through' : ''}`}>{line.name}</span>
              <span className="tnum text-xs text-stone-500">
                {line.quantity} × {formatIls(line.unitPrice)}
              </span>
            </span>
            <span className="tnum shrink-0 font-semibold text-stone-900">
              {formatIls(line.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-sm font-bold text-stone-900">סה״כ ללא מע״מ</span>
        <span className="tnum text-lg font-bold text-stone-900">{formatIls(order.total)}</span>
      </div>
      <p className="tnum text-end text-xs text-stone-400">{formatIls(withVat(order.total))} כולל מע״מ</p>

      {order.confirmedTotal != null && order.confirmedTotal !== order.total && (
        <p className="mt-1 text-end text-sm text-stone-600">
          אושר: <span className="tnum font-bold">{formatIls(order.confirmedTotal)}</span>
        </p>
      )}
      {order.supplierNote && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">
          הערה שלך: {order.supplierNote}
        </p>
      )}

      {order.split ? (
        <p className="mt-3 rounded-lg bg-stone-100 p-3 text-sm text-stone-600">
          {/* Only orders from before checkouts were split per supplier (2026-09-17) can mix suppliers. */}
          הזמנה ישנה, מלפני שכל הזמנה נשלחה לספק אחד. היא כוללת גם ספקים אחרים ולכן לא מאשרים אותה מכאן.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {order.status === 'pending' && (
            <>
              {changing && (
                <div className="space-y-2 rounded-lg bg-stone-50 p-3">
                  <label className="block">
                    <span className="text-xs font-medium text-stone-600">סכום שתספק (ללא מע״מ)</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="tnum mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
                    />
                  </label>
                  <p className="text-xs text-stone-500">סמנו ״חסר״ ליד שורה שלא תסופק, והסכום יתעדכן.</p>
                  <label className="block">
                    <span className="text-xs font-medium text-stone-600">תאריך אספקה (לא חובה)</span>
                    <input
                      type="date"
                      value={deliveryOn}
                      onChange={(e) => setDeliveryOn(e.target.value)}
                      className="tnum mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-stone-600">הערה לנגר (לא חובה)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="למשל: פריט אחד חסר, יגיע ביום ראשון"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
                    />
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-60"
                >
                  <Check size={18} />
                  {busy ? 'מאשר…' : changing ? 'אשר עם השינוי' : 'אשר הזמנה'}
                </button>
                <button
                  type="button"
                  onClick={() => setChanging(!changing)}
                  disabled={busy}
                  className="h-12 shrink-0 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700"
                >
                  {changing ? 'ביטול' : 'יש שינוי'}
                </button>
              </div>
              {rejecting ? (
                <div className="space-y-2 rounded-lg bg-red-50 p-3">
                  <label className="block">
                    <span className="text-xs font-medium text-red-800">למה אי אפשר לספק? הנגר יקבל את זה במייל</span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="למשל: המוצר אזל מהמלאי עד סוף החודש"
                      className="mt-1 w-full rounded-lg border border-red-200 bg-white p-3"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={reject}
                      disabled={busy || reason.trim().length < 2}
                      className="h-11 flex-1 rounded-lg bg-red-700 text-sm font-bold text-white disabled:opacity-50"
                    >
                      דחה את ההזמנה
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700"
                    >
                      חזרה
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                  className="w-full text-center text-sm font-semibold text-red-700"
                >
                  לא יכול לספק את ההזמנה
                </button>
              )}
            </>
          )}

          {/* Optional, for suppliers who want the carpenter to see it: the
              carpenter's timeline shows "בהכנה" only when it was marked. */}
          {order.status === 'confirmed' && (
            <button
              type="button"
              onClick={() => onAction(order, 'prepare')}
              disabled={busy}
              className="h-10 w-full rounded-lg border border-dashed border-stone-300 text-sm font-semibold text-stone-600 disabled:opacity-60"
            >
              סמן שההזמנה בהכנה (לא חובה)
            </button>
          )}

          {['confirmed', 'processing'].includes(order.status) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAction(order, 'ship')}
                disabled={busy}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-stone-900 font-bold text-white disabled:opacity-60"
              >
                <Send size={17} />
                יצא לאספקה
              </button>
              <button
                type="button"
                onClick={() => onAction(order, 'deliver')}
                disabled={busy}
                className="h-12 shrink-0 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700"
              >
                נאסף / סופק
              </button>
            </div>
          )}

          {order.status === 'shipped' && (
            <button
              type="button"
              onClick={() => onAction(order, 'deliver')}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 font-bold text-white disabled:opacity-60"
            >
              <PackageCheck size={18} />
              סופק ללקוח
            </button>
          )}
        </div>
      )}
    </article>
  )
}

const DONE_MESSAGE: Record<Action, string> = {
  confirm: 'ההזמנה אושרה',
  reject: 'ההזמנה נדחתה והנגר עודכן',
  prepare: 'סומן: בהכנה',
  ship: 'סומן: יצא לאספקה',
  deliver: 'סומן: סופק',
}

/**
 * Orders carpenters sent to this supplier — incoming, not placed by them.
 * Waiting ones first, because that is the only part of the screen with work on it.
 */
/**
 * Questions carpenters sent from the agent chat. Each one was also emailed;
 * the answer goes back directly, by phone or WhatsApp.
 */
function Questions({ questions }: { questions: SupplierQuestion[] }) {
  if (questions.length === 0) return null
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold text-stone-900">שאלות מנגריות</h2>
        <Link href="/supplier/messages" className="text-sm font-semibold text-emerald-800">
          לענות באתר
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-stone-100">
        {questions.map((q) => {
          const whatsapp = whatsappLink(q.phone, q.productName ? `שלום, לגבי השאלה שלך על ${q.productName} בשוק הנגרים` : undefined)
          return (
            <li key={q.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-stone-900">{q.carpenter}</span>
                <span className="tnum shrink-0 text-xs text-stone-500">{formatDate(q.createdAt)}</span>
              </div>
              {q.productName && <p className="text-sm text-stone-600">על {q.productName}</p>}
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{q.message}</p>
              {q.phone && (
                <div className="mt-2 flex gap-2">
                  <a href={`tel:${q.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-800">
                    <Phone size={15} /> {q.contactName ?? q.phone}
                  </a>
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                      <MessageCircle size={15} /> וואטסאפ
                    </a>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function OrdersTab({
  orders,
  questions,
  notify,
}: {
  orders: SupplierOrder[]
  questions: SupplierQuestion[]
  notify: Notify
}) {
  const router = useRouter()
  const hasPending = orders.some((order) => order.status === 'pending')
  const [filter, setFilter] = useState<Filter>(hasPending ? 'pending' : 'all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const act = async (
    order: SupplierOrder,
    action: Action,
    extra: Record<string, unknown> = {}
  ): Promise<boolean> => {
    setBusyId(order.id)
    try {
      await callApi(
        '/api/supplier/orders',
        jsonInit('PATCH', { order_id: order.id, action, ...extra })
      )
      notify(DONE_MESSAGE[action])
      router.refresh()
      return true
    } catch (err) {
      notify(err instanceof Error ? err.message : 'הפעולה נכשלה', 'error')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const current = FILTERS.find((item) => item.key === filter)!
  const shown = orders.filter((order) => current.match(order.status))

  return (
    <div className="space-y-3">
      <Questions questions={questions} />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {FILTERS.map((item) => {
            const count = orders.filter((order) => item.match(order.status)).length
            const active = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-300 bg-white text-stone-700'
                }`}
              >
                {item.label}
                <span className={`tnum text-xs ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
          <Inbox size={36} className="mx-auto text-stone-300" />
          <p className="mt-3 font-semibold text-stone-900">
            {orders.length === 0 ? 'עוד לא הגיעו הזמנות' : 'אין הזמנות כאן'}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {orders.length === 0
              ? 'כשנגרייה תזמין ממך, ההזמנה תופיע כאן ותקבל עליה מייל.'
              : 'נסה סינון אחר.'}
          </p>
        </div>
      ) : (
        shown.map((order) => (
          <OrderCard key={order.id} order={order} busy={busyId === order.id} onAction={act} />
        ))
      )}
    </div>
  )
}
