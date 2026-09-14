'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, Clock, MapPin, Check, Phone, Eye, EyeOff } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { unitLabel } from '@/lib/catalog'
import { statusInfo } from '@/lib/order-status'

export interface ConsoleOffer {
  id: string
  productName: string
  baseUnit: string
  sku: string | null
  price: number
  stock: number
  packLabel: string | null
  packQty: number | null
  isActive: boolean
}

export interface ConsoleOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  buyer: string
  phone: string | null
  address: string | null
  paymentTerms: string | null
  lines: { id: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[]
  total: number
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * One row of the supplier's own catalogue, editable in place.
 *
 * Price and stock are what actually change week to week, so they are inputs
 * rather than something behind an edit button. The product's name and unit are
 * not editable here at all: they are shared with every other supplier who
 * carries the same item, and one supplier renaming it would rename it for
 * everyone.
 */
function OfferRow({
  offer,
  busy,
  onSave,
  onToggle,
}: {
  offer: ConsoleOffer
  busy: boolean
  onSave: (id: string, body: Record<string, unknown>) => Promise<boolean>
  onToggle: (id: string, next: boolean) => void
}) {
  const [price, setPrice] = useState(String(offer.price))
  const [stock, setStock] = useState(String(offer.stock))
  const [sku, setSku] = useState(offer.sku ?? '')
  const [saved, setSaved] = useState(false)

  const dirty =
    price !== String(offer.price) || stock !== String(offer.stock) || sku !== (offer.sku ?? '')

  const save = async () => {
    const ok = await onSave(offer.id, {
      price_excl_vat: price,
      stock_qty: stock,
      supplier_sku: sku,
    })
    if (ok) setSaved(true)
  }

  return (
    <div
      className={`border-b border-stone-200 p-3 last:border-b-0 ${
        offer.isActive ? '' : 'bg-stone-50'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p
          className={`font-bold ${offer.isActive ? 'text-stone-900' : 'text-stone-400'}`}
        >
          {offer.productName}
        </p>
        {offer.packLabel && (
          <span className="text-xs text-stone-500">
            נמכר ב{offer.packLabel}
            {offer.packQty ? ` ${offer.packQty} ${unitLabel(offer.baseUnit)}` : ''}
          </span>
        )}
        {!offer.isActive && (
          <span className="rounded bg-stone-200 px-1.5 text-xs text-stone-600">לא פעיל</span>
        )}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="text-xs text-stone-500">מחיר ל{unitLabel(offer.baseUnit)}</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setSaved(false)
            }}
            className="tnum mt-0.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-2"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">מלאי</span>
          <input
            inputMode="numeric"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value)
              setSaved(false)
            }}
            className="tnum mt-0.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-2"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">מק״ט שלי</span>
          <input
            value={sku}
            onChange={(e) => {
              setSku(e.target.value)
              setSaved(false)
            }}
            placeholder="—"
            className="tnum mt-0.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-2"
          />
        </label>

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:bg-stone-200 disabled:text-stone-500"
          >
            <Check size={15} />
            {busy ? '…' : saved && !dirty ? 'נשמר' : 'שמור'}
          </button>
          <button
            type="button"
            onClick={() => onToggle(offer.id, !offer.isActive)}
            disabled={busy}
            title={offer.isActive ? 'הסתר מהקטלוג' : 'החזר לקטלוג'}
            aria-label={offer.isActive ? 'הסתר מהקטלוג' : 'החזר לקטלוג'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-600 disabled:opacity-40"
          >
            {offer.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupplierConsole({
  company,
  orders,
  offers,
  terms,
}: {
  company: string
  orders: ConsoleOrder[]
  offers: ConsoleOffer[]
  terms: { minOrder: number | null; leadTimeDays: number | null; pickupAddress: string | null }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const waiting = orders.filter((order) => order.status === 'pending')
  const live = offers.filter((offer) => offer.isActive)

  const save = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
    setBusy(id)
    setMessage(null)
    try {
      const response = await fetch('/api/supplier/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: id, ...body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השמירה נכשלה')
      router.refresh()
      return true
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'השמירה נכשלה')
      return false
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">{company}</h1>
        <p className="mt-1 text-sm text-stone-600">
          ההזמנות שמחכות לך, והמחירים שלך. שינוי מחיר או מלאי נכנס לקטלוג מיד.
        </p>
      </div>

      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">מחכות לאישור</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">{waiting.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">מוצרים בקטלוג</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">{live.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">סך ההזמנות</p>
          <p className="tnum mt-1 text-2xl font-bold text-stone-900">
            {formatIls(orders.reduce((sum, order) => sum + order.total, 0))}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Truck size={16} className="text-stone-400" />
          ההזמנות שלי ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            עוד לא הגיעו הזמנות.
          </p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-xl border bg-white p-4 ${
                order.status === 'pending' ? 'border-amber-300' : 'border-stone-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-stone-900">{order.buyer}</p>
                  <p className="tnum text-xs text-stone-500">
                    {order.orderNumber} · {formatDate(order.createdAt)}
                  </p>
                  {order.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-stone-600">
                      <MapPin size={12} className="text-stone-400" />
                      {order.address}
                    </p>
                  )}
                  {order.phone && (
                    <a
                      href={`tel:${order.phone}`}
                      className="mt-0.5 flex items-center gap-1 text-xs text-emerald-800"
                    >
                      <Phone size={12} />
                      <span className="tnum">{order.phone}</span>
                    </a>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusInfo(order.status).className
                  }`}
                >
                  {statusInfo(order.status).label}
                </span>
              </div>

              <ul className="mt-3 space-y-1">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-3 text-sm text-stone-700">
                    <span className="min-w-0 truncate">
                      {line.name}
                      <span className="tnum text-stone-400"> × {line.quantity}</span>
                    </span>
                    <span className="tnum shrink-0">{formatIls(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-200 pt-2">
                {order.paymentTerms && (
                  <span className="text-xs text-stone-500">
                    תנאים מבוקשים: <strong className="text-stone-700">{order.paymentTerms}</strong>
                  </span>
                )}
                <span className="tnum ms-auto font-bold text-stone-900">
                  {formatIls(order.total)}
                  <span className="ms-1 text-xs font-normal text-stone-500">ללא מע״מ</span>
                </span>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Package size={16} className="text-stone-400" />
          המחירים שלי ({offers.length})
        </h2>

        {offers.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            עוד לא הועלו לך מוצרים. צור קשר ונטען את המחירון.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {offers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                busy={busy === offer.id}
                onSave={save}
                onToggle={(id, next) => save(id, { is_active: next })}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Clock size={16} className="text-stone-400" />
          התנאים שלי
        </h2>
        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-stone-500">מינימום הזמנה</p>
            <p className="tnum mt-0.5 font-semibold text-stone-900">
              {terms.minOrder ? formatIls(terms.minOrder) : 'לא הוגדר'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">זמן אספקה</p>
            <p className="mt-0.5 font-semibold text-stone-900">
              {terms.leadTimeDays != null ? `${terms.leadTimeDays} ימים` : 'לא הוגדר'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">נקודת איסוף</p>
            <p className="mt-0.5 font-semibold text-stone-900">
              {terms.pickupAddress || 'לא הוגדרה'}
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          את אלה עדיין משנים דרכנו — כתוב לנו ונעדכן.
        </p>
      </section>
    </div>
  )
}
