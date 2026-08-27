'use client'

import Link from 'next/link'

export default function SupplierNav() {
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/supplier" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">🏭</span>
            <div>
              <p className="font-bold text-gray-900">Supplier Dashboard</p>
              <p className="text-xs text-gray-500">Marketplace Negrim</p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex gap-4 items-center">
            <Link
              href="/supplier"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/supplier/products"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              📦 Products
            </Link>
            <Link
              href="/supplier/orders"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              🛒 Orders
            </Link>
            <Link
              href="/supplier/settings"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
