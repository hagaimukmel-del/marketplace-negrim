'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  business_name: string | null
  address: string | null
  city: string | null
  zip_code: string | null
  payment_method: string
  total_amount: number
  status: string
  items_json: string
  notes: string | null
  created_at: string
}

interface OrderItem {
  id: string
  name_he: string
  name_en: string
  base_price_excl_vat: number
  quantity: number
}

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

      // Parse items from JSON
      try {
        const parsedItems = JSON.parse(data.order.items_json)
        setItems(parsedItems)
      } catch {
        setItems([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'בהמתנה' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'מאושר' },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'בעיבוד' },
      shipped: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'נשלח' },
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'הופקד' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'בוטל' },
    }
    const config = statusMap[status] || statusMap.pending
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>{config.label}</span>
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">📋 פרטי הזמנה</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">⏳ טוען פרטים...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">📋 פרטי הזמנה</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-semibold">⚠️ {error || 'ההזמנה לא נמצאה'}</p>
        </div>
        <Link
          href="/carpenter/orders"
          className="inline-block px-6 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-semibold transition"
        >
          ← חזור להזמנות שלי
        </Link>
      </div>
    )
  }

  const totalVat = order.total_amount - order.total_amount / 1.18

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📋 פרטי הזמנה</h1>
            <p className="text-gray-700 mt-2 font-mono">{order.order_number}</p>
          </div>
          <div>{getStatusBadge(order.status)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 פרטי הלקוח</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">שם</p>
                <p className="font-semibold text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">מייל</p>
                <p className="font-semibold text-gray-900">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">טלפון</p>
                <p className="font-semibold text-gray-900">{order.customer_phone}</p>
              </div>
              {order.business_name && (
                <div>
                  <p className="text-sm text-gray-600">שם העסק</p>
                  <p className="font-semibold text-gray-900">{order.business_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🏠 כתובת משלוח</h2>
            <div className="space-y-2">
              {order.address && <p className="text-gray-900 font-semibold">{order.address}</p>}
              <p className="text-gray-600">
                {order.city}{order.zip_code ? `, ${order.zip_code}` : ''}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📦 פריטים</h2>
            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-gray-200 last:border-b-0">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name_he}</p>
                      <p className="text-sm text-gray-600">{item.name_en}</p>
                      <p className="text-sm text-gray-600 mt-1">כמות: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">₪{item.base_price_excl_vat.toFixed(2)}</p>
                      <p className="font-semibold text-gray-900">
                        ₪{(item.base_price_excl_vat * 1.18 * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">אין פריטים בהזמנה</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">סיכום הזמנה</h2>

            <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>ללא מע״מ:</span>
                <span>₪{(order.total_amount / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>מע״מ 18%:</span>
                <span>₪{totalVat.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between text-2xl font-bold text-gray-900 mb-6">
              <span>סה״כ:</span>
              <span>₪{order.total_amount.toFixed(2)}</span>
            </div>

            {/* Payment Info */}
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">שיטת תשלום</p>
              <p className="font-semibold text-gray-900 mt-1">
                {order.payment_method === 'credit_card' && '💳 כרטיס אשראי'}
                {order.payment_method === 'bank_transfer' && '🏦 העברה בנקאית'}
                {order.payment_method === 'cash' && '💰 בתשלום'}
              </p>
            </div>

            {/* Order Date */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>תאריך הזמנה</p>
              <p className="font-semibold text-gray-900 mt-1">
                {new Date(order.created_at).toLocaleDateString('he-IL')} בשעה{' '}
                {new Date(order.created_at).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <Link
            href="/carpenter/orders"
            className="block text-center px-6 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-semibold transition"
          >
            ← חזור להזמנות שלי
          </Link>
        </div>
      </div>
    </div>
  )
}
