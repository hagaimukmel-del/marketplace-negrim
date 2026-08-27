'use client'

import Link from 'next/link'

interface SupplierOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: string
  created_at: string
  items_count: number
}

export default function SupplierOrdersPage() {
  // Demo data - in production this would come from Supabase
  const orders: SupplierOrder[] = [
    {
      id: '1',
      order_number: 'ORD-1692550200000',
      customer_name: 'דב כהן - נגרות כהן',
      customer_phone: '050-123-4567',
      total_amount: 1200,
      status: 'pending',
      created_at: '2026-08-25T10:00:00Z',
      items_count: 2
    },
    {
      id: '2',
      order_number: 'ORD-1692550300000',
      customer_name: 'ירון לוי - עץ יפה',
      customer_phone: '052-987-6543',
      total_amount: 2500,
      status: 'confirmed',
      created_at: '2026-08-24T14:30:00Z',
      items_count: 3
    },
    {
      id: '3',
      order_number: 'ORD-1692550400000',
      customer_name: 'שרה רוזנברג - ריהוט דורגן',
      customer_phone: '053-555-1234',
      total_amount: 3800,
      status: 'processing',
      created_at: '2026-08-23T09:15:00Z',
      items_count: 5
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'בהמתנה' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'מאושר' },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'בעיבוד' },
      shipped: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'נשלח' },
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'הופקד' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'בוטל' }
    }
    const config = statusMap[status] || statusMap.pending
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>{config.label}</span>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
        <h1 className="text-4xl font-bold text-gray-900">🛒 הזמנות הלקוחות</h1>
        <p className="text-gray-700 mt-2">הזמנות שהתקבלו עבור המוצרים שלך</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <p className="text-sm text-gray-600">סה״כ הזמנות</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <p className="text-sm text-gray-600">בהמתנה</p>
          <p className="text-3xl font-bold text-amber-700 mt-2">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <p className="text-sm text-gray-600">בעיבוד</p>
          <p className="text-3xl font-bold text-purple-700 mt-2">{orders.filter(o => o.status === 'processing').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <p className="text-sm text-gray-600">הכנסה כוללת</p>
          <p className="text-3xl font-bold text-emerald-700 mt-2">₪{orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">מספר הזמנה</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">לקוח</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">טלפון</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">פריטים</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">סכום</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">תאריך</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">סטטוס</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.customer_phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.items_count} פריטים</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₪{order.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4">
                    <button className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-xs font-semibold transition">
                      צפה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-2xl text-gray-600">אין הזמנות עדיין</p>
          <p className="text-gray-500 mt-2">הזמנות חדשות יופיעו כאן</p>
        </div>
      )}
    </div>
  )
}
