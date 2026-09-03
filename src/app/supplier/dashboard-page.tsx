'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Supplier {
  id: string
  company_name: string
  contact_name: string
  phone: string
  email: string
}

export default function SupplierDashboard() {
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    products: 0,
    rating: 5.0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('supplier_session')
    if (!session) {
      router.push('/supplier/login')
      return
    }

    const supplierData = JSON.parse(session) as Supplier
    setSupplier(supplierData)
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('supplier_session')
    localStorage.removeItem('supplier_token')
    router.push('/supplier/login')
  }

  if (loading || !supplier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-700 rounded-full"></div>
          </div>
          <p className="text-lg text-gray-700 font-medium">טוען לוח בקרה...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-amber-900 to-green-700 bg-clip-text text-transparent mb-2">
              🏢 {supplier.company_name}
            </h1>
            <p className="text-gray-600">ברוכים הבאים, {supplier.contact_name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-all"
          >
            🚪 התנתק
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <div className="text-3xl mb-2">📦</div>
            <p className="text-gray-600 text-sm mb-1">הזמנות</p>
            <p className="text-3xl font-bold text-gray-900">{stats.orders}</p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-gray-600 text-sm mb-1">הכנסה</p>
            <p className="text-3xl font-bold text-green-700">₪{stats.revenue.toLocaleString()}</p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <div className="text-3xl mb-2">🛍️</div>
            <p className="text-gray-600 text-sm mb-1">מוצרים</p>
            <p className="text-3xl font-bold text-amber-900">{stats.products}</p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-gray-600 text-sm mb-1">דירוג</p>
            <p className="text-3xl font-bold text-amber-600">{stats.rating.toFixed(1)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/supplier/products"
              className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:shadow-lg transition-all hover:scale-105 text-center font-semibold"
            >
              📝 ניהול מוצרים
            </Link>
            <Link
              href="/supplier/orders"
              className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all hover:scale-105 text-center font-semibold"
            >
              📋 הזמנות
            </Link>
            <Link
              href="/supplier/settings"
              className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all hover:scale-105 text-center font-semibold"
            >
              ⚙️ הגדרות חשבון
            </Link>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50/60 border border-blue-100/40 rounded-xl p-4 text-sm text-blue-900">
          📞 טלפון: {supplier.phone} | 📧 מייל: {supplier.email}
        </div>
      </div>
    </div>
  )
}
