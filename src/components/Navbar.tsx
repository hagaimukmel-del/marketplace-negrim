'use client'

import Link from 'next/link'
import { useState } from 'react'

interface NavbarProps {
  userRole?: 'carpenter' | 'supplier' | 'admin' | null
  userName?: string
  cartCount?: number
}

export default function Navbar({ userRole = null, userName = '', cartCount = 0 }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigationItems = {
    carpenter: [
      { label: '🏪 קטלוג', href: '/catalog' },
      { label: '📦 ההזמנות שלי', href: '/dashboard/orders' },
      { label: '🔄 החזרות', href: '/dashboard/returns' },
    ],
    supplier: [
      { label: '📊 לוח קרן', href: '/supplier/dashboard' },
      { label: '📦 המוצרים שלי', href: '/supplier/products' },
      { label: '🛒 הזמנות', href: '/supplier/orders' },
      { label: '🔄 החזרות', href: '/supplier/returns' },
    ],
    admin: [
      { label: '📊 דוחות', href: '/admin/dashboard' },
      { label: '🏢 ספקים', href: '/admin/suppliers' },
      { label: '📦 מוצרים', href: '/admin/products' },
      { label: '🔄 החזרות', href: '/admin/returns' },
    ],
  }

  const navItems = userRole ? navigationItems[userRole] : []

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">🏗️</span>
            <div className="hidden sm:block">
              <p className="text-lg font-bold text-gray-900">Marketplace Negrim</p>
              <p className="text-xs text-gray-500">שוק הנגרים</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 relative group"
              >
                {item.label}
                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* Cart Badge (Carpenter Only) */}
            {userRole === 'carpenter' && (
              <Link href="/cart" className="relative group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <span className="text-xl">👤</span>
                {userName && <span className="hidden sm:inline text-sm font-medium text-gray-700">{userName}</span>}
                <span className={`text-gray-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {menuOpen && (
                <div className="absolute left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 w-56 z-50 overflow-hidden">
                  {userName ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                        <p className="font-semibold text-gray-900">{userName}</p>
                        <p className="text-xs text-gray-600 mt-1 capitalize">{userRole}</p>
                      </div>
                      <Link href="/settings" className="block px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        ⚙️ הגדרות
                      </Link>
                      <button className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors border-t border-gray-200">
                        🚪 התנתקות
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        🔐 התחברות
                      </Link>
                      <Link href="/register" className="block px-4 py-2.5 hover:bg-blue-50 text-blue-600 font-medium text-sm border-t border-gray-200 transition-colors">
                        📝 הרשמה
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-gray-700 text-xl">☰</button>
        </div>
      </div>
    </nav>
  )
}
