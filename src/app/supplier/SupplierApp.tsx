'use client'

import { useRef, useState } from 'react'
import { Truck, Package, Building2, Handshake, CheckCircle2, Circle, ChevronLeft } from 'lucide-react'
import OrdersTab from './tabs/OrdersTab'
import ProductsTab from './tabs/ProductsTab'
import BusinessTab from './tabs/BusinessTab'
import TermsTab from './tabs/TermsTab'
import type { CategoryOption, ProductItem, SupplierOrder, SupplierProfile, Tab } from './types'

export type Notify = (text: string, kind?: 'ok' | 'error') => void

const TAB_META: Record<Tab, { label: string; Icon: typeof Truck }> = {
  orders: { label: 'הזמנות נכנסות', Icon: Truck },
  products: { label: 'מוצרים', Icon: Package },
  business: { label: 'פרטי העסק', Icon: Building2 },
  terms: { label: 'תנאי סחר', Icon: Handshake },
}

const ORDER: Tab[] = ['orders', 'products', 'business', 'terms']

interface ChecklistItem {
  label: string
  done: boolean
  tab: Tab
}

/**
 * What is still missing before a carpenter sees a complete supplier.
 *
 * Each line jumps to the screen that fixes it, so an empty profile is a short
 * list of taps rather than a page to explore. It disappears once everything is
 * done — a finished checklist is only clutter.
 */
function Checklist({ items, onGo }: { items: ChecklistItem[]; onGo: (tab: Tab) => void }) {
  const done = items.filter((item) => item.done).length
  const percent = Math.round((done / items.length) * 100)

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold text-stone-900">השלמת הפרופיל</h2>
        <span className="tnum text-sm font-semibold text-emerald-800">
          {done} מתוך {items.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-stone-100">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onGo(item.tab)}
              disabled={item.done}
              className="flex w-full items-center gap-3 py-2.5 text-start disabled:cursor-default"
            >
              {item.done ? (
                <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />
              ) : (
                <Circle size={19} className="shrink-0 text-stone-300" />
              )}
              <span
                className={`flex-1 text-sm ${
                  item.done ? 'text-stone-400 line-through' : 'font-medium text-stone-800'
                }`}
              >
                {item.label}
              </span>
              {!item.done && <ChevronLeft size={16} className="shrink-0 text-stone-400" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The supplier's workspace: four tabs over data the server already loaded.
 *
 * On a phone the tabs sit in a bar at the bottom, where a thumb reaches them;
 * on a wider screen they sit at the top. The active tab is written to the URL
 * without a navigation, so a reload or a shared link comes back to the same
 * screen and switching never waits on the network.
 */
export default function SupplierApp({
  initialTab,
  profile,
  products,
  orders,
  categories,
}: {
  initialTab: Tab
  profile: SupplierProfile
  products: ProductItem[]
  orders: SupplierOrder[]
  categories: CategoryOption[]
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify: Notify = (text, kind = 'ok') => {
    setToast({ text, kind })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3500)
  }

  const go = (next: Tab) => {
    setTab(next)
    window.history.replaceState(null, '', `?tab=${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const waiting = orders.filter((order) => order.status === 'pending').length

  const checklist: ChecklistItem[] = [
    { label: 'להעלות לוגו', done: Boolean(profile.logo_url), tab: 'business' },
    {
      label: 'טלפון ומייל לקבלת הזמנות',
      done: Boolean(profile.phone && profile.email),
      tab: 'business',
    },
    { label: 'לבחור תנאי תשלום', done: profile.payment_terms.length > 0, tab: 'terms' },
    {
      label: 'מינימום הזמנה וזמן אספקה',
      done: profile.min_order_value_excl_vat != null && profile.default_lead_time_days != null,
      tab: 'terms',
    },
    { label: 'להוסיף מוצר ראשון', done: products.length > 0, tab: 'products' },
    {
      label: 'תמונה לכל מוצר',
      done: products.length > 0 && products.every((product) => product.imageUrl),
      tab: 'products',
    },
  ]
  const incomplete = checklist.some((item) => !item.done)

  return (
    <div className="space-y-4 pb-28 sm:pb-6">
      <div>
        <h1 className="text-xl font-bold text-stone-900">שלום, {profile.company_name}</h1>
        <p className="mt-0.5 text-sm text-stone-600">
          {waiting > 0
            ? `${waiting === 1 ? 'הזמנה אחת מחכה' : `${waiting} הזמנות מחכות`} לאישור שלך.`
            : 'אין הזמנות שמחכות לאישור.'}
        </p>
      </div>

      {incomplete && <Checklist items={checklist} onGo={go} />}

      {/* Wider screens: tabs across the top. */}
      <nav className="hidden gap-1 rounded-xl border border-stone-200 bg-white p-1 sm:flex">
        {ORDER.map((key) => {
          const { label, Icon } = TAB_META[key]
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon size={16} />
              {label}
              {key === 'orders' && waiting > 0 && (
                <span
                  className={`tnum rounded-full px-1.5 text-xs font-bold ${
                    active ? 'bg-white text-stone-900' : 'bg-emerald-700 text-white'
                  }`}
                >
                  {waiting}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div>
        {tab === 'orders' && <OrdersTab orders={orders} notify={notify} />}
        {tab === 'products' && (
          <ProductsTab products={products} categories={categories} notify={notify} />
        )}
        {tab === 'business' && <BusinessTab profile={profile} notify={notify} />}
        {tab === 'terms' && <TermsTab profile={profile} notify={notify} />}
      </div>

      {/* Phones: a bar at the bottom, where the thumb already is. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          {ORDER.map((key) => {
            const { label, Icon } = TAB_META[key]
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  active ? 'text-emerald-800' : 'text-stone-500'
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                {label}
                {key === 'orders' && waiting > 0 && (
                  <span className="tnum absolute top-1.5 end-[28%] flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold text-white">
                    {waiting}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg sm:bottom-6 ${
            toast.kind === 'ok' ? 'bg-stone-900 text-white' : 'bg-red-700 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
