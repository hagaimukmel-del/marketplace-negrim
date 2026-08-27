'use client'

import Link from 'next/link'

interface DashboardCard {
  title: string
  value: string | number
  icon: string
  color: string
  link?: string
}

export default function SupplierDashboard() {
  // Demo data - in production this would come from Supabase
  const dashboardCards: DashboardCard[] = [
    {
      title: 'סה״כ הזמנות',
      value: 24,
      icon: '📦',
      color: 'bg-blue-50 border-blue-200',
      link: '/supplier/orders'
    },
    {
      title: 'הזמנות בתהליך',
      value: 5,
      icon: '⏳',
      color: 'bg-amber-50 border-amber-200'
    },
    {
      title: 'הזמנות משולמות',
      value: 19,
      icon: '✅',
      color: 'bg-emerald-50 border-emerald-200'
    },
    {
      title: 'הכנסות חודשיות',
      value: '₪ 15,240',
      icon: '💰',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'מוצרים פעילים',
      value: 42,
      icon: '📦',
      color: 'bg-cyan-50 border-cyan-200',
      link: '/supplier/products'
    },
    {
      title: 'דירוג ממוצע',
      value: '4.8 / 5.0',
      icon: '⭐',
      color: 'bg-yellow-50 border-yellow-200'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
        <h1 className="text-4xl font-bold text-gray-900">📊 לוח בקרה</h1>
        <p className="text-gray-700 mt-2">ברוך הבא לדashboard ספק Marketplace Negrim</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => (
          <Link
            key={card.title}
            href={card.link || '#'}
            className={`block rounded-xl shadow-md border p-6 hover:shadow-lg hover:scale-105 transition-all ${card.color} ${card.link ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📦 הזמנות אחרונות</h2>
          <Link
            href="/supplier/orders"
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold transition text-sm"
          >
            צפה בהכל →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 text-sm">שם לקוח</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 text-sm">מוצר</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 text-sm">כמות</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 text-sm">סכום</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 text-sm">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm text-gray-900">לקוח {idx + 1}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">דבק דקורטיבי</td>
                  <td className="px-6 py-3 text-sm text-gray-600">10 יח׳</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">₪1,200</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold text-xs">
                      בהמתנה
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/supplier/products"
          className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-8 hover:shadow-lg transition-all"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">📦 ניהול מוצרים</h3>
          <p className="text-gray-600">הוסף, ערוך, או מחק מוצרים מהקטלוג שלך</p>
        </Link>

        <Link
          href="/supplier/settings"
          className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-8 hover:shadow-lg transition-all"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">⚙️ הגדרות</h3>
          <p className="text-gray-600">עדכן פרטי חברה, בנק, ותצורות</p>
        </Link>
      </div>
    </div>
  )
}
