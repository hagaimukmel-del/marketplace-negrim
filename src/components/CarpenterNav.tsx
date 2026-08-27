'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export default function CarpenterNav() {
  const cart = useCart()

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/carpenter" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-bold text-gray-900">שוק הנגרים</p>
              <p className="text-xs text-gray-500">Marketplace Negrim</p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex gap-4 items-center">
            <Link
              href="/carpenter/catalog"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              📚 קטלוג
            </Link>
            <Link
              href="/carpenter/orders"
              className="px-4 py-2 text-gray-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition"
            >
              📋 הזמנות
            </Link>

            {/* Cart Button */}
            <Link
              href="/carpenter/cart"
              className="relative px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold transition flex items-center gap-2"
            >
              🛒 עגלה
              {cart.totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
