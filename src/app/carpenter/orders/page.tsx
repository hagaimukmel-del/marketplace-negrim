'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { statusInfo } from '@/lib/order-status'

interface Order {
  id: string
  order_number: string
  subtotal_excl_vat: number
  total_amount: number
  status: string | null
  created_at: string | null
  payment_method: string | null
  order_items?: { id: string }[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/orders?limit=50')
        if (!response.ok) throw new Error('טעינת ההזמנות נכשלה')
        const data = await response.json()
        setOrders(data.orders ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'טעינת ההזמנות נכשלה')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-semibold text-stone-900">לא הצלחנו לטעון את ההזמנות</p>
        <p className="mt-1 text-sm text-stone-500">{error}</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold text-stone-900">אין הזמנות עדיין</h1>
        <p className="mt-2 text-stone-600">כשתשלח הזמנה ראשונה היא תופיע כאן.</p>
        <Link
          href="/carpenter/catalog"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-stone-900 px-5 font-semibold text-white"
        >
          <ArrowRight size={17} />
          לקטלוג
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-900">ההזמנות שלי</h1>
        <p className="text-sm text-stone-500">{orders.length} הזמנות</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {orders.map((order) => {
          const status = statusInfo(order.status)
          const lines = order.order_items?.length ?? 0

          return (
            <Link
              key={order.id}
              href={`/carpenter/orders/${order.id}`}
              className="flex items-center gap-3 border-b border-stone-200 p-3 last:border-b-0 hover:bg-stone-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-sm font-semibold text-stone-900">
                    {order.order_number}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString('he-IL')
                    : '—'}
                  {lines > 0 && ` · ${lines} פריטים`}
                  {order.payment_method && ` · ${order.payment_method}`}
                </p>
              </div>

              <div className="shrink-0 text-end">
                {/* Excl VAT is the binding figure and the one that matches the
                    order record; the incl-VAT total is context, not headline. */}
                <p className="tnum font-bold text-stone-900">
                  {formatIls(Number(order.subtotal_excl_vat))}
                </p>
                <p className="text-xs text-stone-400">ללא מע״מ</p>
              </div>

              <ChevronLeft size={18} className="shrink-0 text-stone-400" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
