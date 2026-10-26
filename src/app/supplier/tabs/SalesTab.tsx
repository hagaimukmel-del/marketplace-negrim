'use client'

import { useState } from 'react'
import { MessageCircle, Phone, TrendingUp, Users } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { whatsappLink } from '../types'
import type { Sales } from '../sales'
import { telUrl } from '@/lib/phone'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Jerusalem' })
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-stone-900">{value}</p>
      {note && <p className="mt-0.5 text-sm text-stone-500">{note}</p>}
    </div>
  )
}

/**
 * "המכירות שלי" and the customers behind them.
 *
 * Everything is this supplier's own orders: turnover by month, what sells, how
 * many orders were confirmed against rejected, and which carpentries ordered.
 * Only carpentries that ordered from this supplier appear, never the rest of
 * the market. Amounts are excl. VAT, at the amount the supplier confirmed.
 */
export default function SalesTab({ sales }: { sales: Sales }) {
  const [view, setView] = useState<'sales' | 'customers'>('sales')
  const decided = sales.won + sales.rejected
  const max = Math.max(...sales.months.map((month) => month.amount), 1)
  const change = sales.lastMonth > 0 ? Math.round(((sales.thisMonth - sales.lastMonth) / sales.lastMonth) * 100) : null

  if (sales.won + sales.rejected + sales.waiting === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-8 text-center">
        <TrendingUp size={40} className="mx-auto text-stone-300" />
        <h2 className="mt-3 text-lg font-bold text-stone-900">עוד אין מכירות</h2>
        <p className="mt-1 text-base text-stone-600">כשנגריות יזמינו ממך, יופיעו כאן המחזור, המוצרים המובילים והלקוחות.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-stone-300 bg-white p-0.5 sm:w-fit" role="group" aria-label="תצוגה">
        {(
          [
            ['sales', 'המכירות שלי', TrendingUp],
            ['customers', `לקוחות (${sales.customers.length})`, Users],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-base font-semibold ${
              view === key ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {view === 'sales' ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile
              label="החודש"
              value={formatIls(sales.thisMonth)}
              note={change == null ? 'ללא מע״מ' : `${change >= 0 ? '+' : ''}${change}% מהחודש שעבר`}
            />
            <Tile label="החודש שעבר" value={formatIls(sales.lastMonth)} note="ללא מע״מ" />
            <Tile
              label="אושרו מול נדחו"
              value={`${sales.won} / ${sales.rejected}`}
              note={decided > 0 ? `${Math.round((sales.won / decided) * 100)}% אושרו` : undefined}
            />
            <Tile label="מחכות לאישור" value={String(sales.waiting)} />
          </div>

          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold text-stone-900">מחזור לפי חודש</h2>
            <p className="text-sm text-stone-500">הזמנות שאישרת, בסכום שאישרת, ללא מע״מ</p>
            <ul className="mt-3 space-y-1.5">
              {sales.months.map((month) => (
                <li key={month.key} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-base">
                  <span className="text-stone-600">{month.label}</span>
                  <span className="h-5 overflow-hidden rounded bg-stone-100">
                    <span
                      className="block h-full rounded bg-emerald-600"
                      style={{ width: `${(month.amount / max) * 100}%` }}
                    />
                  </span>
                  <span className="tnum w-24 text-end font-semibold text-stone-900">
                    {month.amount > 0 ? formatIls(month.amount) : '—'}
                    {month.orders > 0 && <span className="ms-1 text-sm font-normal text-stone-500">({month.orders})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {sales.products.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <h2 className="px-4 pt-4 font-bold text-stone-900">מוצרים מובילים</h2>
              <p className="px-4 text-sm text-stone-500">לפי סכום שורות ההזמנה שאישרת, ללא מע״מ</p>
              <table className="mt-2 w-full text-base">
                <thead className="bg-stone-50 text-sm text-stone-600">
                  <tr>
                    <th className="px-4 py-2 text-start font-semibold">מוצר</th>
                    <th className="px-2 py-2 text-end font-semibold">כמות</th>
                    <th className="px-4 py-2 text-end font-semibold">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.products.map((product) => (
                    <tr key={product.name} className="border-t border-stone-100">
                      <td className="px-4 py-2 text-stone-900">{product.name}</td>
                      <td className="tnum px-2 py-2 text-end text-stone-600">{product.quantity}</td>
                      <td className="tnum px-4 py-2 text-end font-semibold text-stone-900">{formatIls(product.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : (
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <p className="border-b border-stone-100 px-4 py-3 text-sm text-stone-500">
            רק נגריות שהזמינו ממך. סכומים של הזמנות שאישרת, ללא מע״מ.
          </p>
          <ul>
            {sales.customers.map((customer) => {
              const wa = whatsappLink(customer.phone)
              return (
                <li key={customer.key} className="flex items-center gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900">{customer.name}</p>
                    <p className="text-sm text-stone-500">
                      {customer.contactName ? `${customer.contactName} · ` : ''}
                      הזמנה אחרונה {formatDate(customer.lastOrderAt)}
                      {customer.waiting > 0 && <span className="font-semibold text-amber-700"> · {customer.waiting === 1 ? 'אחת מחכה' : `${customer.waiting} מחכות`}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="tnum font-bold text-stone-900">{formatIls(customer.amount)}</p>
                    <p className="text-sm text-stone-500">
                      {customer.orders === 1 ? 'הזמנה אחת' : `${customer.orders} הזמנות`}
                    </p>
                  </div>
                  {customer.phone && (
                    <div className="flex shrink-0 gap-1">
                      <a
                        href={telUrl(customer.phone) ?? undefined}
                        aria-label={`להתקשר ל${customer.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
                      >
                        <Phone size={17} />
                      </a>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`וואטסאפ ל${customer.name}`}
                          className="hidden h-10 w-10 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 sm:flex"
                        >
                          <MessageCircle size={17} />
                        </a>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
