'use client'

// Admin Dashboard - No protection needed for now, just show the dashboard
export default function AdminDashboard() {
  const stats = [
    { label: 'סה"כ ספקים', value: 156, icon: '🏢', color: 'bg-blue-100 text-blue-600' },
    { label: 'ספקים פעילים', value: 142, icon: '✅', color: 'bg-green-100 text-green-600' },
    { label: 'הזמנות חודש זה', value: 1243, icon: '📦', color: 'bg-purple-100 text-purple-600' },
    { label: 'הכנסה חודש זה', value: '₪185K', icon: '💰', color: 'bg-yellow-100 text-yellow-600' },
  ]

  const recentSuppliers = [
    { name: 'דבקי איתמיר', status: 'active', date: '2026-01-15' },
    { name: 'חוטי סיב דרום', status: 'active', date: '2026-02-20' },
    { name: 'דבקים ישראלית', status: 'pending', date: '2026-08-10' },
  ]

  const recentOrders = [
    { id: 'ORD-001', supplier: 'דבקי איתמיר', amount: '₪1,850', status: 'delivered', date: '2026-08-16' },
    { id: 'ORD-002', supplier: 'חוטי סיב', amount: '₪450', status: 'shipped', date: '2026-08-15' },
    { id: 'ORD-003', supplier: 'דבקים ישראלית', amount: '₪2,100', status: 'processing', date: '2026-08-14' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">📊 דוחות ניהול</h1>
        <p className="text-gray-600 mt-1">ביקורת כללית על פעילות המערכת</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-4xl p-3 rounded-lg ${stat.color}`}>
                {stat.icon}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Suppliers */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🏢 ספקים אחרונים</h2>
          <div className="space-y-3">
            {recentSuppliers.map((supplier, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold text-gray-900">{supplier.name}</p>
                  <p className="text-xs text-gray-500">{supplier.date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  supplier.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {supplier.status === 'active' ? '✅ פעיל' : '⏳ בהמתנה'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📦 הזמנות אחרונות</h2>
          <div className="space-y-3">
            {recentOrders.map((order, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-500">{order.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{order.amount}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'delivered' && '✅'}
                    {order.status === 'shipped' && '📦'}
                    {order.status === 'processing' && '⏳'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
