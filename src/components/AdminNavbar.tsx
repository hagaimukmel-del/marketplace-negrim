'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function AdminNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { signOut } = useAuth()
  const router = useRouter()

  const navItems = [
    { label: '📊 דוחות', href: '/admin/dashboard' },
    { label: '🏢 ספקים', href: '/admin/suppliers' },
    { label: '📦 מוצרים', href: '/admin/products' },
    { label: '🛒 הזמנות', href: '/admin/orders' },
    { label: '🔄 החזרות', href: '/admin/returns' },
    { label: '👥 משתמשים', href: '/admin/users' },
    { label: '⚙️ הגדרות', href: '/admin/settings' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">👨‍💼</span>
            <div>
              <p className="text-lg font-bold text-gray-900">Admin Panel</p>
              <p className="text-xs text-gray-500">Marketplace Negrim</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-1 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <span className="text-xl">👤</span>
              <span className={`text-gray-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {menuOpen && (
              <div className="absolute left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 w-48 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">Admin</p>
                  <p className="text-xs text-gray-600 mt-1">מנהל מערכת</p>
                </div>
                <Link
                  href="/admin/profile"
                  className="block px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                >
                  ⚙️ הגדרות פרופיל
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await signOut()
                      router.push('/auth/login')
                    } catch (error) {
                      console.error('Sign out error:', error)
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors border-t border-gray-200"
                >
                  🚪 התנתקות
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
