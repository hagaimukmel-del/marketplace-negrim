'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SupplierLayout({ children }: { children: ReactNode }) {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>
  }

  if (!user || userRole !== 'supplier') {
    router.push('/auth/login')
    return null
  }

  const navItems = [
    { label: '🏠 בית', href: '/supplier' },
    { label: '📦 מוצרים', href: '/supplier/products' },
    { label: '🛒 הזמנות', href: '/supplier/orders' },
    { label: '📊 דוחות', href: '/supplier/reports' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/supplier" className="flex items-center gap-2 hover:opacity-80 transition">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-lg font-bold text-gray-900">Negrim Supplier</p>
                <p className="text-xs text-gray-500">ממשק ספקים</p>
              </div>
            </Link>

            <div className="flex gap-1 items-center">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg font-medium text-sm transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-xl">👤</span>
              </button>
              <div className="absolute right-0 mt-0 bg-white rounded-xl shadow-lg border border-gray-200 w-48 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
                  <p className="font-semibold text-gray-900 text-sm">{user?.email}</p>
                  <p className="text-xs text-gray-600 mt-1">📦 ספק</p>
                </div>
                <Link
                  href="/supplier/settings"
                  className="block px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                >
                  ⚙️ הגדרות
                </Link>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors border-t border-gray-200"
                >
                  🚪 התנתקות
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
