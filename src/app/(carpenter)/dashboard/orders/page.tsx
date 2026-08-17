'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'

// Mock orders data
const mockOrders = [
  {
    id: 'ORD-2026-001234',
    date: '2026-08-16',
    status: 'shipped',
    totalInclVat: 1798.4,
    items: 7,
    supplier: 'דבקי איתמיר',
    trackingNumber: '1234567890',
  },
  {
    id: 'ORD-2026-001233',
    date: '2026-08-10',
    status: 'delivered',
    totalInclVat: 295,
    items: 3,
    supplier: 'חוטי סיב דרום',
  },
  {
    id: 'ORD-2026-001232',
    date: '2026-08-05',
    status: 'processing',
    totalInclVat: 2247.2,
    items: 5,
    supplier: 'דבקי איתמיר',
  },
  {
    id: 'ORD-2026-001231',
    date: '2026-07-28',
    status: 'delivered',
    totalInclVat: 5900,
    items: 20,
    supplier: 'דבקי איתמיר',
  },
  {
    id: 'ORD-2026-001230',
    date: '2026-07-15',
    status: 'delivered',
    totalInclVat: 890,
    items: 4,
    supplier: 'חוטי סיב דרום',
  },
]

const statusConfig = {
  pending: { label: '⏳ בהמתנה', color: 'bg-gray-100 text-gray-800' },
  processing: { label: '🔄 בעיבוד', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '📦 נשלח', color: 'bg-orange-100 text-orange-800' },
  delivered: { label: '✅ הובא', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '❌ בוטל', color: 'bg-red-100 text-red-800' },
  returned: { label: '🔄 החזר', color: 'bg-purple-100 text-purple-800' },
}

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredOrders =
    filterStatus === 'all' ? mockOrders : mockOrders.filter((o) => o.status === filterStatus)

  const selectedOrderData = mockOrders.find((o) => o.id === selectedOrder)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole="carpenter" userName="דב & בנו" cartCount={0} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <h1 className="text-4xl font-bold">📋 ההזמנות שלי</h1>
          <p className="text-gray-600">עקוב אחרי סטטוס ההזמנות שלך</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded whitespace-nowrap font-semibold transition ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
              >
                🏷️ הכל ({mockOrders.length})
              </button>
              {Object.entries(statusConfig).map(([key, { label }]) => {
                const count = mockOrders.filter((o) => o.status === key).length
                return (
                  count > 0 && (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`px-4 py-2 rounded whitespace-nowrap font-semibold transition ${
                        filterStatus === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  )
                )
              })}
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order.id)}
                    className={`bg-white rounded-lg border p-6 cursor-pointer transition hover:shadow-lg ${
                      selectedOrder === order.id ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold">{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          📅 {new Date(order.date).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                          statusConfig[order.status as keyof typeof statusConfig].color
                        }`}
                      >
                        {statusConfig[order.status as keyof typeof statusConfig].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">ספק</p>
                        <p className="font-semibold">{order.supplier}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">פריטים</p>
                        <p className="font-semibold">{order.items} יח'</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">סה"כ</p>
                        <p className="font-bold text-blue-600">₪{order.totalInclVat.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                  <p className="text-gray-500">❌ לא נמצאו הזמנות בסטטוס זה</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Order Details */}
          <div className="lg:col-span-1">
            {selectedOrderData ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8 space-y-6">
                <h3 className="text-xl font-bold">📦 פרטי הזמנה</h3>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-600">מספר הזמנה</p>
                    <p className="font-semibold">{selectedOrderData.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">תאריך</p>
                    <p className="font-semibold">
                      {new Date(selectedOrderData.date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">סטטוס</p>
                    <p
                      className={`inline-block mt-1 px-3 py-1 rounded text-sm font-semibold ${
                        statusConfig[selectedOrderData.status as keyof typeof statusConfig].color
                      }`}
                    >
                      {statusConfig[selectedOrderData.status as keyof typeof statusConfig].label}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">ספק</p>
                    <p className="font-semibold">{selectedOrderData.supplier}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">כמות פריטים</p>
                    <p className="font-semibold">{selectedOrderData.items} יח'</p>
                  </div>

                  {selectedOrderData.trackingNumber && (
                    <div>
                      <p className="text-gray-600">מספר עקיבה</p>
                      <p className="font-semibold">{selectedOrderData.trackingNumber}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>סה"כ:</span>
                    <span className="text-blue-600">₪{selectedOrderData.totalInclVat.toFixed(2)}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">📍 סטטוס עדכון</h4>
                  <div className="space-y-2 text-sm">
                    {selectedOrderData.status === 'delivered' && (
                      <>
                        <div className="flex gap-3">
                          <span className="text-green-600">✅</span>
                          <div>
                            <p className="font-semibold">הובאה</p>
                            <p className="text-gray-600">הזמנה הובאה בהצלחה</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span>✅</span>
                          <div>
                            <p className="font-semibold">שלחה</p>
                            <p className="text-gray-600">הזמנה שלחה מהמחסן</p>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedOrderData.status === 'shipped' && (
                      <>
                        <div className="flex gap-3">
                          <span className="text-orange-600">📦</span>
                          <div>
                            <p className="font-semibold">בדרך אליך</p>
                            <p className="text-gray-600">הזמנה בדרך לעתיד</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span>✅</span>
                          <div>
                            <p className="font-semibold">שלחה</p>
                            <p className="text-gray-600">הזמנה שלחה מהמחסן</p>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedOrderData.status === 'processing' && (
                      <>
                        <div className="flex gap-3">
                          <span className="text-blue-600">🔄</span>
                          <div>
                            <p className="font-semibold">בעיבוד</p>
                            <p className="text-gray-600">הזמנה מעובדת במחסן</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span>✅</span>
                          <div>
                            <p className="font-semibold">הזמנה אושרה</p>
                            <p className="text-gray-600">הזמנה נקבלה במערכת</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4 space-y-2">
                  <button className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
                    👁️ צפה בפרטים מלאים
                  </button>
                  <button className="w-full bg-gray-200 text-gray-800 py-2 rounded font-semibold hover:bg-gray-300">
                    📞 צור קשר עם הספק
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-500">בחר הזמנה כדי לראות פרטים</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
