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
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            🏗️ Marketplace Negrim
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-blue-200 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Cart Badge (Carpenter Only) */}
            {userRole === 'carpenter' && cartCount > 0 && (
              <Link href="/cart" className="relative">
                <span className="text-2xl">🛒</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 hover:text-blue-200"
              >
                <span>👤</span>
                {userName && <span className="hidden sm:inline">{userName}</span>}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 bg-white text-gray-800 rounded shadow-lg w-48 z-50">
                  {userName ? (
                    <>
                      <div className="px-4 py-2 border-b">
                        <p className="font-semibold">{userName}</p>
                        <p className="text-sm text-gray-500">{userRole}</p>
                      </div>
                      <Link href="/settings" className="block px-4 py-2 hover:bg-gray-100">
                        ⚙️ הגדרות
                      </Link>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
                        🚪 התנתקות
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block px-4 py-2 hover:bg-gray-100">
                        🔐 התחברות
                      </Link>
                      <Link href="/register" className="block px-4 py-2 hover:bg-gray-100">
                        📝 הרשמה
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white">☰</button>
        </div>
      </div>
    </nav>
  )
}
