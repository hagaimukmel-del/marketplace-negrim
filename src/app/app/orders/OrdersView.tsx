'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LayoutGrid, Search } from 'lucide-react'
import { money, when } from '@/lib/app/format'
import { attentionOf, totalOf, STATUS_LABEL, type AppOrder } from '@/lib/app/orders'
import { StatusDot } from '@/components/app/ui'
import { useReorder } from '@/components/app/useReorder'

/**
 * Sections, not filters. A filter that opens on "needs attention" hides every
 * other order behind a chip; sections show the whole picture in one scroll, in
 * the order that matters. The reason an order needs you is written on its row,
 * and a received order carries "הזמן שוב" — which is what history is opened for.
 */
export default function OrdersView({ orders, now }: { orders: AppOrder[]; now: number }) {
  const [query, setQuery] = useState('')
  const [showAllDone, setShowAllDone] = useState(false)

  if (orders.length === 0) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-1">
        <h1 className="m-0 text-2xl font-extrabold">הזמנות</h1>
        <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
          <b className="block text-ink">עוד אין הזמנות</b>
          ההזמנה הראשונה שתשלח תופיע כאן, עם הסטטוס שלה מול הספק.
        </div>
        <Link href="/app/catalog" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[11px] bg-brand font-bold text-navy">
          <LayoutGrid size={18} /> לקטלוג
        </Link>
      </div>
    )
  }

  const attention = orders.filter((o) => attentionOf(o, now))
  const open = orders.filter((o) => !attention.includes(o) && !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter((o) => !attention.includes(o) && ['delivered', 'cancelled'].includes(o.status))

  const q = query.trim().toLowerCase()
  const hits = q
    ? orders.filter((o) => String(o.shortNumber).includes(q) || o.supplier?.name.toLowerCase().includes(q) || o.lines.some((l) => l.name.toLowerCase().includes(q)))
    : []

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-1">
      <section>
        <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">הזמנות</h1>
        <div className="text-[14.5px] text-muted">
          <span className="tnum">{orders.length}</span> הזמנות · {attention.length + open.length ? <><span className="tnum">{attention.length + open.length}</span> פתוחות</> : 'אין הזמנות פתוחות'}
        </div>
      </section>

      <div className="relative">
        <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="מספר הזמנה, ספק או מוצר"
          aria-label="חיפוש הזמנות"
          className="h-[50px] w-full rounded-xl border-[1.5px] border-hair bg-white ps-11 pe-3.5 text-base placeholder:text-faint"
        />
      </div>

      {q ? (
        hits.length ? (
          <Section title={<>תוצאות <span className="tnum font-medium text-muted">({hits.length})</span></>} orders={hits} now={now} />
        ) : (
          <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
            <b className="block text-ink">לא נמצאו הזמנות</b>
            נסה מספר הזמנה, שם ספק או שם מוצר.
          </div>
        )
      ) : (
        <>
          {attention.length > 0 && (
            <Section
              title={
                <span className="inline-flex items-center gap-2">
                  <span className="tnum grid h-6 min-w-6 place-items-center rounded-full border border-brand-line bg-brand-soft px-1.5 text-[13px] font-extrabold text-attn">{attention.length}</span>
                  דורשות את תשומת לבך
                </span>
              }
              orders={attention}
              now={now}
            />
          )}
          {open.length > 0 && <Section title="בתהליך" orders={open} now={now} />}
          {done.length > 0 && (
            <Section
              title="התקבלו"
              orders={showAllDone ? done : done.slice(0, 5)}
              now={now}
              action={
                done.length > 5 ? (
                  <button type="button" onClick={() => setShowAllDone((v) => !v)} className="text-sm font-semibold text-brand-ink">
                    {showAllDone ? 'הצג פחות' : `הצג את כל ${done.length} ←`}
                  </button>
                ) : null
              }
            />
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, orders, now, action }: { title: React.ReactNode; orders: AppOrder[]; now: number; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-base font-bold">{title}</h3>
        {action}
      </div>
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {orders.map((order) => (
          <OrderLine key={order.id} order={order} now={now} />
        ))}
      </div>
    </section>
  )
}

function OrderLine({ order, now }: { order: AppOrder; now: number }) {
  const { reorder, busy } = useReorder()
  const need = attentionOf(order, now)
  const done = !need && (order.status === 'delivered' || order.status === 'cancelled')
  const reason = need === 'changed' ? 'הספק אישר סכום שונה' : need === 'waiting' ? 'ממתינה לאישור מעל יום' : null
  const label = order.status === 'shipped' ? 'בדרך אליך' : STATUS_LABEL[order.status]

  return (
    <div className={`grid items-center gap-3 border-t border-hair px-3.5 py-2.5 first:border-t-0 hover:bg-[#FDFBF8] ${done ? 'grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_90px_120px_110px]' : 'grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_90px_170px_120px]'}`}>
      <Link href={`/app/orders/${order.id}`} className="grid min-w-0 leading-snug">
        <b className="tnum text-[15px]">#{order.shortNumber}</b>
        <small className="truncate text-[12.5px] text-muted">
          {order.supplier?.name} · {done ? (order.status === 'cancelled' ? 'בוטלה' : `התקבלה ${when(order.deliveredAt ?? order.createdAt, now)}`) : `נשלחה ${when(order.createdAt, now)}`}
        </small>
        {reason && <em className="text-[13px] font-bold not-italic text-attn">{reason}</em>}
      </Link>
      <span className="hidden text-sm text-muted md:block">
        <span className="tnum">{order.lines.length}</span> פריטים
      </span>
      {!done && (
        <Link href={`/app/orders/${order.id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
          <StatusDot status={order.status} />
          {label}
        </Link>
      )}
      <span className="tnum min-w-16 text-end font-bold">{money(totalOf(order))}</span>
      {done && order.status !== 'cancelled' && (
        <button type="button" disabled={busy} onClick={() => reorder(order)} className="h-[38px] rounded-[11px] border-[1.5px] border-hair bg-white px-3 text-sm font-bold disabled:opacity-60">
          {busy ? '…' : 'הזמן שוב'}
        </button>
      )}
    </div>
  )
}
