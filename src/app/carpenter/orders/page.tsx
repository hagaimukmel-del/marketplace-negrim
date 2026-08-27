'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total_amount: number
  status: string
  created_at: string
  payment_method: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders?limit=20')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
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

  const getPaymentBadge = (method: string) => {
    const methodMap: Record<string, string> = {
      credit_card: '💳 כרטיס אשראי',
      bank_transfer: '🏦 העברה בנקאית',
      cash: '💰 בתשלום',
    }
    return methodMap[method] || method
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">📦 ההזמנות שלי</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">⏳ טוען הזמנות...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">📦 ההזמנות שלי</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-semibold">⚠️ {error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">📦 ההזמנות שלי</h1>
        </div>

        <div className="text-center py-12">
          <p className="text-2xl text-gray-600 mb-6">אין לך הזמנות עדיין</p>
          <Link
            href="/carpenter/catalog"
            className="inline-block px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold"
          >
            ← חזור לקטלוג
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
        <h1 className="text-4xl font-bold text-gray-900">📦 ההזמנות שלי</h1>
        <p className="text-gray-700 mt-2">{orders.length} הזמנות</p>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">מספר הזמנה</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">תאריך</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">סכום</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">שיטת תשלום</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">סטטוס</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-sm font-semibold">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₪{order.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{getPaymentBadge(order.payment_method)}</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/carpenter/orders/${order.id}`}
                      className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm font-semibold transition"
                    >
                      צפה
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back to Catalog */}
      <Link
        href="/carpenter/catalog"
        className="inline-block px-6 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-semibold transition"
      >
        ← חזור לקטלוג
      </Link>
    </div>
  )
}
