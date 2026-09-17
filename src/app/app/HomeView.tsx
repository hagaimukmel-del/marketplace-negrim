'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, MessageCircle, Recycle, Search } from 'lucide-react'
import { useCart, type CartItem } from '@/lib/cart-context'
import { money, when, packText } from '@/lib/app/format'
import { attentionOf, totalOf, STATUS_LABEL, type AppOrder } from '@/lib/app/orders'
import type { CategoryNode } from '@/lib/app/products'
import type { ReorderItem } from '@/lib/app/catalog-server'
import { AttentionLine, Kicker, SectionTitle, StatusDot } from '@/components/app/ui'
import CategoryGlyph from '@/components/app/CategoryGlyph'

type Minimums = Record<string, { name: string; min: number | null }>

interface CartGroup {
  supplierId: string
  name: string
  total: number
  short: number
}

type Action =
  | { p: 1; kind: 'changed'; order: AppOrder }
  | { p: 2 | 3; kind: 'cart'; groups: CartGroup[]; items: number; total: number; short: CartGroup | null }
  | { p: 4; kind: 'waiting'; order: AppOrder }

function cartGroups(items: CartItem[], minimums: Minimums): CartGroup[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    const key = item.supplier_id ?? ''
    totals.set(key, (totals.get(key) ?? 0) + item.base_price_excl_vat * item.quantity)
  }
  return [...totals].map(([supplierId, total]) => {
    const min = minimums[supplierId]?.min ?? null
    return { supplierId, name: minimums[supplierId]?.name ?? 'ספק', total, short: min ? Math.max(0, min - total) : 0 }
  })
}

/**
 * The next-action rule. Not AI: a fixed order, and only what needs the
 * carpenter counts — 1 a changed confirmed amount, 2 an order short of a
 * supplier's minimum, 3 an order ready to send, 4 a supplier silent for a day.
 */
function actionsFor(orders: AppOrder[], items: CartItem[], minimums: Minimums, now: number): Action[] {
  const list: Action[] = []
  for (const order of orders) {
    const need = attentionOf(order, now)
    if (need === 'changed') list.push({ p: 1, kind: 'changed', order })
    if (need === 'waiting') list.push({ p: 4, kind: 'waiting', order })
  }
  if (items.length) {
    const groups = cartGroups(items, minimums)
    const short = groups.find((g) => g.short > 0) ?? null
    list.push({ p: short ? 2 : 3, kind: 'cart', groups, items: items.length, total: groups.reduce((s, g) => s + g.total, 0), short })
  }
  return list.sort((a, b) => a.p - b.p)
}

export default function HomeView({
  greeting,
  now,
  orders,
  reorder,
  categories,
  minimums,
}: {
  greeting: string
  now: number
  orders: AppOrder[]
  reorder: ReorderItem[]
  categories: CategoryNode[]
  minimums: Minimums
}) {
  const cart = useCart()
  const actions = actionsFor(orders, cart.items, minimums, now)
  const isNew = orders.length === 0 && cart.items.length === 0

  if (isNew) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Hello greeting={greeting} anchor="בוא נמצא את מה שצריך">
          <p className="mt-1 mb-0 text-[15px] text-muted">חיפוש, קטגוריות, והזמנה ראשונה ישירות מהספק.</p>
        </Hello>
        <SearchBlock />
        <CategoryList categories={categories} />
        <HowItWorks />
        <Metzion />
      </div>
    )
  }

  const top = actions[0]
  const cardOrderId = top && top.kind !== 'cart' ? top.order.id : null
  const cartBehind = top && top.kind !== 'cart' ? actions.find((a) => a.kind === 'cart') : undefined

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Hello greeting={greeting} anchor="הנגרייה שלך בשליטה">
        <AttentionLine count={actions.length} calmText="אין כרגע משהו שמחכה לך">
          {actions.length === 1 ? 'דבר אחד דורש את תשומת לבך' : 'דברים דורשים את תשומת לבך'}
        </AttentionLine>
      </Hello>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          {top && (
            <div className="grid gap-2.5">
              <NextCard action={top} now={now} />
              {cartBehind && cartBehind.kind === 'cart' && (
                <Link href="/app/order" className="flex items-center justify-between rounded-xl bg-navy-soft px-3.5 py-2.5 text-[14.5px] font-semibold text-navy">
                  <span>
                    העגלה שלך מחכה · <span className="tnum">{cartBehind.items}</span> פריטים
                  </span>
                  <ChevronLeft size={18} />
                </Link>
              )}
            </div>
          )}
          <ActiveOrders orders={orders} excludeId={cardOrderId} now={now} />
          <Reorder items={reorder} />
          <div className="md:hidden">
            <SearchBlock />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          <CategoryStrip categories={categories} />
          <Metzion />
        </div>
      </div>
    </div>
  )
}

function Hello({ greeting, anchor, children }: { greeting: string; anchor: string; children: React.ReactNode }) {
  return (
    <section className="pt-1">
      <div className="text-[15px] font-medium text-muted">{greeting}</div>
      <h1 className="m-0 mt-0.5 text-[28px] font-extrabold leading-tight tracking-tight text-navy text-balance md:text-[34px]">{anchor}</h1>
      {children}
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-hair bg-white px-4 pb-4 pt-3.5 shadow-[0_8px_24px_rgba(30,42,59,.06)]">{children}</section>
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-3.5 flex h-12 w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand text-[15px] font-bold text-navy hover:bg-brand-hover">
      {children}
      <ChevronLeft size={18} strokeWidth={2.2} />
    </Link>
  )
}

function NextCard({ action, now }: { action: Action; now: number }) {
  if (action.kind === 'changed') {
    const o = action.order
    return (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Kicker tone="attn">דורשת בדיקה</Kicker>
          <span className="text-[13px] text-muted">אושרה {when(o.confirmedAt, now)}</span>
        </div>
        <h2 className="m-0 mt-2 text-[19px] font-bold">
          הזמנה <span className="tnum">#{o.shortNumber}</span>
        </h2>
        <p className="m-0 text-[14.5px] text-muted">
          {o.supplier?.name} · {o.lines.length} פריטים
        </p>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <s className="tnum text-base text-faint">{money(o.submitted)}</s>
          <span className="text-faint" aria-label="שונה ל">←</span>
          <b className="tnum text-[22px] font-extrabold">{money(o.confirmed ?? o.submitted)}</b>
        </div>
        <p className="m-0 mt-0.5 text-sm font-semibold text-attn">הספק אישר סכום שונה</p>
        <PrimaryLink href={`/app/orders/${o.id}`}>בדוק את ההזמנה</PrimaryLink>
      </Card>
    )
  }
  if (action.kind === 'cart') {
    return (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Kicker tone={action.short ? 'attn' : 'ready'}>{action.short ? 'כמעט מוכנה' : 'העגלה שלך מוכנה'}</Kicker>
          <span className="text-[13px] text-muted">לפני מע״מ</span>
        </div>
        <h2 className="m-0 mt-2 text-[19px] font-bold">
          <span className="tnum">{action.items}</span> פריטים · {action.groups.length === 1 ? 'ספק אחד' : `${action.groups.length} ספקים`}
        </h2>
        <div className="tnum mt-2 text-[22px] font-extrabold">{money(action.total)}</div>
        <p className="m-0 mt-0.5 text-sm font-semibold text-attn">
          {action.short
            ? `חסר ${money(action.short.short)} למינימום אצל ${action.short.name}`
            : action.groups.length > 1
              ? `תישלח כ-${action.groups.length} הזמנות רכש, אחת לכל ספק`
              : 'תישלח כהזמנת רכש אחת'}
        </p>
        <PrimaryLink href="/app/order">{action.short ? 'השלם את ההזמנה' : 'המשך להזמנה'}</PrimaryLink>
      </Card>
    )
  }
  const o = action.order
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <Kicker tone="attn">ממתינה לספק</Kicker>
        <span className="text-[13px] text-muted">נשלחה {when(o.createdAt, now)}</span>
      </div>
      <h2 className="m-0 mt-2 text-[19px] font-bold">
        הזמנה <span className="tnum">#{o.shortNumber}</span>
      </h2>
      <p className="m-0 text-[14.5px] text-muted">
        {o.supplier?.name} · {o.lines.length} פריטים · <span className="tnum">{money(totalOf(o))}</span>
      </p>
      <p className="m-0 mt-0.5 text-sm font-semibold text-attn">הספק עוד לא אישר</p>
      <WhatsAppReminder order={o} />
    </Card>
  )
}

export function whatsappHref(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const intl = digits.startsWith('972') ? digits : `972${digits.replace(/^0/, '')}`
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}

function WhatsAppReminder({ order }: { order: AppOrder }) {
  const href = whatsappHref(order.supplier?.phone, `שלום, לגבי הזמנה #${order.shortNumber} מנגרימ — אשמח לאישור. תודה!`)
  if (!href) {
    return (
      <Link href={`/app/orders/${order.id}`} className="mt-3.5 flex h-12 w-full items-center justify-center rounded-[11px] bg-brand font-bold text-navy">
        פרטי ההזמנה
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover">
      <MessageCircle size={18} />
      תזכורת לספק
    </a>
  )
}

function ActiveOrders({ orders, excludeId, now }: { orders: AppOrder[]; excludeId: string | null; now: number }) {
  const open = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status) && o.id !== excludeId)
  const rows = open.length ? open.slice(0, 3) : orders.filter((o) => o.id !== excludeId).slice(0, 1)
  if (!rows.length) return null
  return (
    <section>
      <SectionTitle title={open.length ? 'הזמנות פעילות' : 'הזמנה אחרונה'} href="/app/orders" action="הצג הכול" />
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {rows.map((o) => {
          const need = attentionOf(o, now)
          return (
            <Link key={o.id} href={`/app/orders/${o.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-hair px-3.5 py-2.5 first:border-t-0 hover:bg-[#FDFBF8]">
              <span className="grid min-w-0 leading-tight">
                <b className="tnum text-[15px]">#{o.shortNumber}</b>
                <small className="truncate text-[12.5px] text-muted">{o.supplier?.name}</small>
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                <StatusDot status={o.status} />
                {o.status === 'shipped' ? 'בדרך אליך' : STATUS_LABEL[o.status]}
                {need === 'waiting' && <em className="rounded-full bg-brand-soft px-1.5 text-[11.5px] font-bold not-italic text-attn">מעל יום</em>}
              </span>
              <span className="tnum min-w-16 text-end font-bold">{money(totalOf(o))}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Reorder({ items }: { items: ReorderItem[] }) {
  const cart = useCart()
  const [added, setAdded] = useState<string | null>(null)
  if (!items.length) return null
  return (
    <section>
      <SectionTitle title="הזמן שוב" href="/app/orders" action="הצג הכול" />
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {items.map((item, i) => {
          const offer = item.product.offers.find((o) => o.supplierId === item.supplierId)!
          const pack = packText(offer.packLabel, offer.packQty, item.product.unit)
          return (
            <div key={item.product.id} className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-hair px-3.5 py-2.5 first:border-t-0 ${i === 2 ? 'hidden md:grid' : ''}`}>
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-wood-soft text-[#7A5A3A]">
                <CategoryGlyph icon={item.product.icon} size={20} />
              </span>
              <Link href={`/app/product/${item.product.id}`} className="grid min-w-0 leading-tight">
                <b className="truncate text-[15px]">{item.product.name}</b>
                <small className="truncate text-[13px] text-muted">
                  {pack ? `${pack} · ` : ''}
                  <span className="tnum">{money((offer.price ?? 0) * (offer.packQty ?? 1))}</span>
                  {offer.packQty ? '' : ` ל${item.product.unit}`}
                </small>
              </Link>
              <button
                type="button"
                className="h-[38px] rounded-[11px] border-[1.5px] border-hair bg-white px-3 text-sm font-bold"
                onClick={() => {
                  cart.addItem(
                    {
                      id: item.product.id,
                      name_he: item.product.name,
                      name_en: '',
                      base_price_excl_vat: offer.price ?? 0,
                      supplier_id: offer.supplierId,
                      supplier_name: offer.supplierName,
                      unit: item.product.unit,
                      pack_label: offer.packLabel,
                      pack_qty: offer.packQty,
                    },
                    item.lastQuantity
                  )
                  setAdded(item.product.id)
                }}
              >
                {added === item.product.id ? '✓ נוסף' : 'הזמן שוב'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SearchBlock() {
  return (
    <section>
      <SectionTitle title="מה אתה מחפש?" />
      <form action="/app/catalog" className="relative">
        <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          name="q"
          type="search"
          placeholder="מה אתה צריך? מוצר או ספק"
          aria-label="חיפוש"
          className="h-[50px] w-full rounded-xl border-[1.5px] border-hair bg-white ps-11 pe-3.5 text-base placeholder:text-faint"
        />
      </form>
    </section>
  )
}

function CategoryStrip({ categories }: { categories: CategoryNode[] }) {
  return (
    <section>
      <SectionTitle title="קטגוריות" href="/app/catalog" action="לקטלוג" />
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/app/catalog/${c.id}`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-hair bg-white px-3 text-[14.5px] font-semibold hover:border-wood"
          >
            <span className="text-navy">
              <CategoryGlyph icon={c.icon} size={20} />
            </span>
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  )
}

export function CategoryList({ categories }: { categories: CategoryNode[] }) {
  return (
    <section>
      <SectionTitle title="קטגוריות" />
      <div className="grid overflow-hidden rounded-2xl border border-hair bg-white md:grid-cols-2">
        {categories.map((c) => {
          const names = (c.count ? c.children.filter((ch) => ch.count) : c.children).map((ch) => ch.name)
          return (
            <Link
              key={c.id}
              href={`/app/catalog/${c.id}`}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-t border-hair px-3.5 py-2.5 first:border-t-0 hover:bg-[#FDFBF8] md:[&:nth-child(2)]:border-t-0 md:odd:border-e"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.count ? 'bg-wood-soft text-navy' : 'bg-[#F1EDE7] text-muted'}`}>
                <CategoryGlyph icon={c.icon} size={22} />
              </span>
              <span className="grid min-w-0 leading-snug">
                <b className="text-base">{c.name}</b>
                <small className="truncate text-[13px] text-muted">
                  {c.count ? (
                    <>
                      <span className="tnum">{c.count}</span> מוצרים ·{' '}
                    </>
                  ) : (
                    <span className="me-1 rounded-full bg-[#F1F2F4] px-1.5 text-[11.5px] font-bold">בקרוב</span>
                  )}
                  {names.slice(0, 2).join(', ')}
                  {names.length > 2 ? '…' : ''}
                </small>
              </span>
              <ChevronLeft size={18} className="text-faint" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps: [string, string][] = [
    ['מוצאים', 'חיפוש או קטגוריה'],
    ['מוסיפים', 'המערכת מציעה ספק, ואפשר להחליף'],
    ['שולחים', 'הזמנת רכש לכל ספק'],
    ['עוקבים', 'הספק מאשר, מספק ומוציא חשבונית'],
  ]
  return (
    <section>
      <SectionTitle title="איך זה עובד" />
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm text-muted">
            <span className="mb-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
            <b className="block text-[15px] text-ink">{title}</b>
            {text}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Metzion() {
  return (
    <Link href="/carpenter/metzion" className="flex items-center gap-3 rounded-xl border border-[#E6D6C2] bg-wood-soft px-3.5 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-[#6B4E2E]">
        <Recycle size={22} />
      </span>
      <span>
        <b className="block text-[15px]">מציאון</b>
        <span className="text-[13.5px] text-[#6B4E2E]">עודפים ומכונות מנגרים לנגרים</span>
      </span>
    </Link>
  )
}
