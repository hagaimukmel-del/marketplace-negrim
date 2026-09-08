'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { OrderItemRow, OrderWithItems } from '@/lib/db'
import { formatIls, vatAmount } from '@/lib/vat'
import { statusInfo } from '@/lib/order-status'

type Order = OrderWithItems
type OrderItem = OrderItemRow

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) throw new Error('Failed to fetch order')
      const data = await response.json()

      setOrder(data.order)
      setItems(data.order.order_items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-40 animate-pulse rounded-xl bg-stone-200" />
        <div className="h-56 animate-pulse rounded-xl bg-stone-200" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-semibold text-stone-900">ההזמנה לא נמצאה</p>
        {error && <p className="mt-1 text-sm text-stone-500">{error}</p>}
        <Link
          href="/carpenter/orders"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-stone-900 px-5 font-semibold text-white"
        >
          לכל ההזמנות
        </Link>
      </div>
    )
  }

  const totalVat = vatAmount(order.subtotal_excl_vat, order.vat_rate)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-stone-900">פרטי הזמנה</h1>
            <p className="text-stone-700 mt-2 font-mono">{order.order_number}</p>
          </div>
          <div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                statusInfo(order.status).className
              }`}
            >
              {statusInfo(order.status).label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-4 lg:col-span-2">
          {/* Customer Info */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-stone-900">פרטי הלקוח</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-stone-500">שם</p>
                <p className="font-semibold text-stone-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">מייל</p>
                <p className="font-semibold text-stone-900">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">טלפון</p>
                <p className="font-semibold text-stone-900">{order.customer_phone}</p>
              </div>
              {order.business_name && (
                <div>
                  <p className="text-sm text-stone-500">שם העסק</p>
                  <p className="font-semibold text-stone-900">{order.business_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-stone-900">כתובת משלוח</h2>
            <div className="space-y-2">
              {order.address && <p className="font-semibold text-stone-900">{order.address}</p>}
              <p className="text-stone-600">
                {order.city}{order.zip_code ? `, ${order.zip_code}` : ''}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-stone-900">פריטים</h2>
            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-stone-200 last:border-b-0">
                    <div>
                      <p className="font-semibold text-stone-900">{item.product_name_he}</p>
                      <p className="text-sm text-stone-500">{item.product_name_en}</p>
                      <p className="text-sm text-stone-500 mt-1">כמות: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-stone-600 text-sm">
                        {formatIls(item.unit_price_excl_vat)} ליח׳
                      </p>
                      <p className="font-semibold text-stone-900">
                        {formatIls(item.line_total_excl_vat)}
                      </p>
                      <p className="text-xs text-gray-500">ללא מע״מ</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-stone-600">אין פריטים בהזמנה</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 sticky top-20">
            <h2 className="mb-3 font-bold text-stone-900">סיכום הזמנה</h2>

            <div className="space-y-3 border-b border-stone-200 pb-4 mb-4">
              <div className="flex justify-between text-sm text-stone-500">
                <span>ללא מע״מ:</span>
                <span>{formatIls(order.subtotal_excl_vat)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-500">
                <span>מע״מ {(order.vat_rate * 100).toFixed(0)}%:</span>
                <span>{formatIls(totalVat)}</span>
              </div>
            </div>

            <div className="flex justify-between mb-3 font-bold text-stone-900">
              <span>סה״כ:</span>
              <span>{formatIls(order.total_amount)}</span>
            </div>

            {/* Payment Info */}
            <div className="mb-3 rounded-lg bg-stone-100 p-3">
              <p className="text-sm text-stone-500">תנאי תשלום</p>
              <p className="font-semibold text-stone-900 mt-1">
                {order.payment_method ?? 'ייקבעו מול הספק'}
              </p>
              <p className="text-xs text-stone-600 mt-2">
                הספק מספק את ההזמנה ומוציא חשבונית ישירות. זו הזמנת רכש, לא חשבונית.
              </p>
            </div>

            {/* Order Date */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-stone-500">
              <p>תאריך הזמנה</p>
              <p className="font-semibold text-stone-900 mt-1">
                {new Date(order.created_at ?? Date.now()).toLocaleDateString('he-IL')} בשעה{' '}
                {new Date(order.created_at ?? Date.now()).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <Link
            href="/carpenter/orders"
            className="block text-center px-6 py-3 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold transition"
          >
            חזור להזמנות שלי
          </Link>
        </div>
      </div>
    </div>
  )
}
