'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, Check, ClipboardList, FileText, MessageCircle, Phone, Repeat, Truck } from 'lucide-react'
import { money, termsText, when } from '@/lib/app/format'
import { attentionOf, orderSteps, quantityText, totalOf, type AppOrder } from '@/lib/app/orders'
import { VAT_RATE } from '@/lib/vat'
import { BackLink, Kicker, StatusDot, Timeline } from '@/components/app/ui'
import { useReorder } from '@/components/app/useReorder'
import { whatsappHref } from '../../HomeView'

/**
 * The order page. The order's state is the anchor — one calm line under its
 * number. A card appears only when the order wants something from the
 * carpenter, with one action: accept a changed amount, remind the supplier,
 * say it arrived. A received order's one action is ordering it again.
 */
export default function OrderDetail({ order, siblings, now }: { order: AppOrder; siblings: AppOrder[]; now: number }) {
  const router = useRouter()
  const { reorder, busy } = useReorder()
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const need = attentionOf(order, now)
  const supplier = order.supplier
  const diff = order.confirmed != null ? order.confirmed - order.submitted : 0
  const at = (iso: string) => when(iso, now)
  const whatsapp = whatsappHref(supplier?.phone, `שלום, לגבי הזמנה #${order.shortNumber} מנגרימ`)

  const act = async (action: 'seen' | 'received') => {
    setActing(true)
    setError(null)
    try {
      const response = await fetch(`/api/app/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setActing(false)
    }
  }

  const stateLine = {
    pending: `ממתינה לאישור הספק · נשלחה ${at(order.createdAt)}`,
    confirmed: `הספק אישר${order.confirmedAt ? ` · ${at(order.confirmedAt)}` : ''}`,
    processing: 'בהכנה אצל הספק',
    shipped: `בדרך אליך${order.shippedAt ? ` · ${at(order.shippedAt)}` : ''}`,
    delivered: `התקבלה${order.deliveredAt ? ` · ${at(order.deliveredAt)}` : ''}`,
    cancelled: 'בוטלה',
  }[order.status]

  const primary = 'mt-3.5 flex h-12 w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover disabled:opacity-60'
  const quiet = 'mx-auto mt-2.5 block text-center text-sm font-semibold text-brand-ink'

  let card: React.ReactNode = null
  if (need === 'changed') {
    card = (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Kicker tone="attn">דורשת בדיקה</Kicker>
          {order.confirmedAt && <span className="text-[13px] text-muted">אושרה {at(order.confirmedAt)}</span>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
          <s className="tnum text-base text-faint">{money(order.submitted)}</s>
          <span className="text-faint" aria-label="שונה ל">←</span>
          <b className="tnum text-[22px] font-extrabold">{money(order.confirmed ?? order.submitted)}</b>
          <bdi dir="ltr" className="tnum text-sm font-bold text-attn">
            {`${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`}
          </bdi>
        </div>
        <p className="m-0 mt-0.5 text-sm font-semibold text-attn">הספק אישר סכום שונה</p>
        {order.supplierNote && (
          <div className="mt-2 rounded-[10px] border border-dashed border-[#EBD3AE] bg-white/70 px-2.5 py-2 text-[14.5px] text-[#5B4632]">
            ״{order.supplierNote}״ — {supplier?.name}
          </div>
        )}
        <button type="button" disabled={acting} onClick={() => act('seen')} className={primary}>
          ראיתי, מקובל
        </button>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={quiet}>
            לא מסתדר? שאלה לספק בוואטסאפ
          </a>
        )}
      </Card>
    )
  } else if (need === 'waiting') {
    card = (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Kicker tone="attn">ממתינה לספק</Kicker>
          <span className="text-[13px] text-muted">נשלחה {at(order.createdAt)}</span>
        </div>
        <p className="m-0 mt-2 text-sm font-semibold text-attn">הספק עוד לא אישר את ההזמנה</p>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={primary}>
            <MessageCircle size={18} /> תזכורת לספק
          </a>
        ) : null}
        {supplier?.phone && (
          <a href={`tel:${supplier.phone}`} className={quiet}>
            או חיוג לספק
          </a>
        )}
      </Card>
    )
  } else if (order.status === 'shipped' || order.status === 'processing' || order.status === 'confirmed') {
    card = (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Kicker tone="ready">
            {order.status === 'shipped' ? (
              <>
                <Truck size={14} /> בדרך אליך
              </>
            ) : (
              'אושרה'
            )}
          </Kicker>
        </div>
        <p className="m-0 mt-2 text-[14.5px] text-muted">כשהסחורה אצלך — סמן, והספק יראה שהתקבלה.</p>
        <button type="button" disabled={acting} onClick={() => act('received')} className={primary}>
          <Check size={18} strokeWidth={2.4} /> קיבלתי את ההזמנה
        </button>
      </Card>
    )
  }

  const again = (primaryStyle: boolean) => (
    <button type="button" disabled={busy} onClick={() => reorder(order)} className={primaryStyle ? primary.replace('mt-3.5 ', '') : quiet}>
      {primaryStyle && <Repeat size={18} />} {busy ? 'מוסיף…' : 'הזמן שוב את כל ההזמנה'}
    </button>
  )

  const steps = (
    <section className="rounded-2xl border border-hair bg-white p-3.5">
      <Timeline steps={orderSteps(order)} formatAt={at} />
    </section>
  )

  const lines = (
    <section>
      <h3 className="mb-2 text-base font-bold">
        פריטים <span className="tnum font-medium text-muted">({order.lines.length})</span>
      </h3>
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {order.lines.map((line, i) => (
          <div key={`${line.productId}-${i}`} className="grid gap-px border-t border-hair px-3.5 py-2.5 first:border-t-0">
            <div className="flex items-baseline gap-2">
              {line.productId ? (
                <Link href={`/app/product/${line.productId}`} className="font-bold">
                  {line.name}
                </Link>
              ) : (
                <b>{line.name}</b>
              )}
              <span className="tnum ms-auto whitespace-nowrap font-bold">{money(line.lineTotal)}</span>
            </div>
            <div className="text-[13px] text-muted">
              {quantityText(line)} · <span className="tnum">{money(line.unitPrice)}</span> ל{line.unit} בעת ההזמנה
            </div>
          </div>
        ))}
        <div className="grid gap-2 border-t border-hair bg-[#FBF9F6] px-3.5 py-2.5">
          <div className="grid gap-1 text-[15px]">
            <div className={`flex justify-between ${order.confirmed != null ? 'text-sm text-muted' : ''}`}>
              <span>סכום ששלחת</span>
              <span className="tnum">{money(order.submitted)}</span>
            </div>
            {order.confirmed != null && (
              <div className="flex justify-between font-bold">
                <span>אישר הספק</span>
                <span className="tnum">{money(order.confirmed)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted">
              <span>כולל מע״מ {Math.round(VAT_RATE * 100)}% (להמחשה)</span>
              <span className="tnum">{money(totalOf(order) * (1 + VAT_RATE))}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <FileText size={14} /> הזמנת רכש, לא חשבונית · החשבונית מגיעה מ{supplier?.name ?? 'הספק'}
          </div>
        </div>
      </div>
    </section>
  )

  const contact = (
    <section className="overflow-hidden rounded-2xl border border-hair bg-white">
      {supplier && (
        <Row icon={<Building2 size={18} />}>
          <b>{supplier.name}</b>
          <small className="text-[12.5px] text-muted">
            {termsText(supplier.terms)}
            {supplier.leadDays != null ? ` · עד ${supplier.leadDays} ימי עסקים` : ''}
          </small>
          <span className="flex gap-1.5">
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} aria-label="חיוג לספק" className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-hair text-navy">
                <Phone size={18} />
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="וואטסאפ לספק" className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-hair text-navy">
                <MessageCircle size={18} />
              </a>
            )}
          </span>
        </Row>
      )}
      {order.address && (
        <Row icon={<Truck size={18} />}>
          <small className="text-[12.5px] text-muted">אספקה ל</small>
          <b>{order.address}</b>
        </Row>
      )}
      {order.notes && (
        <Row icon={<FileText size={18} />}>
          <small className="text-[12.5px] text-muted">ההערה שלך</small>
          <span>{order.notes}</span>
        </Row>
      )}
      {siblings.length > 0 && (
        <Row icon={<ClipboardList size={18} />}>
          <small className="text-[12.5px] text-muted">נשלחה יחד עם</small>
          <span className="flex flex-wrap gap-x-2">
            {siblings.map((s) => (
              <Link key={s.id} href={`/app/orders/${s.id}`} className="font-semibold text-brand-ink">
                #{s.shortNumber} · {s.supplier?.name}
              </Link>
            ))}
          </span>
        </Row>
      )}
    </section>
  )

  const delivered = order.status === 'delivered' && !need

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-1">
      <BackLink href="/app/orders" label="הזמנות" />
      <section>
        <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">
          הזמנה <span className="tnum">#{order.shortNumber}</span>
        </h1>
        <div className="text-[14.5px] text-muted">
          {supplier?.name} · נשלחה {at(order.createdAt)}
        </div>
        <div className="mt-2 inline-flex items-center gap-2 text-[15.5px] text-muted">
          <StatusDot status={order.status} size={9} />
          {stateLine}
        </div>
        {order.carpenterSeenAt && order.confirmed != null && order.confirmed !== order.submitted && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-ok-ink">
            <Check size={15} strokeWidth={2.6} /> ראית את הסכום המעודכן
          </div>
        )}
      </section>
      {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {delivered && again(true)}
          {card}
          {order.status !== 'cancelled' && steps}
          {lines}
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
          {contact}
          {!delivered && again(false)}
        </div>
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-hair bg-white px-4 pb-4 pt-3.5 shadow-[0_8px_24px_rgba(30,42,59,.06)]">{children}</section>
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  const parts = Array.isArray(children) ? children : [children]
  const action = parts.length === 3 ? parts[2] : null
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-hair px-3.5 py-3 first:border-t-0">
      <span className="text-muted">{icon}</span>
      <span className="grid min-w-0 leading-snug">{action ? parts.slice(0, 2) : parts}</span>
      <span>{action}</span>
    </div>
  )
}
