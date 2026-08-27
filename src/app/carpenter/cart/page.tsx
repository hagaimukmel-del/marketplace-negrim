'use client'

import { useCart } from '@/lib/cart-context'
import Link from 'next/link'

export default function CartPage() {
  const cart = useCart()

  if (cart.items.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
          <h1 className="text-4xl font-bold text-gray-900">🛒 עגלת קניות</h1>
        </div>

        <div className="text-center py-12">
          <p className="text-2xl text-gray-600 mb-6">העגלה שלך ריקה</p>
          <Link
            href="/carpenter/catalog"
            className="inline-block px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold"
          >
            ← חזור לקטלוג
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
        <h1 className="text-4xl font-bold text-gray-900">🛒 עגלת קניות</h1>
        <p className="text-gray-700 mt-2">{cart.totalItems} פריטים</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const priceWithVat = item.base_price_excl_vat * 1.18
            const itemTotal = priceWithVat * item.quantity

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{item.name_he}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.name_en}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    ₪{priceWithVat.toFixed(2)} לּ×{item.quantity} = <span className="font-semibold">₪{itemTotal.toFixed(2)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center py-1 font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => cart.removeItem(item.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">סיכום הזמנה</h2>

            <div className="space-y-3 border-b border-gray-200 pb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">סכום ללא מע״מ:</span>
                <span className="font-semibold">
                  ₪{(cart.totalPrice / 1.18).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">מע״מ (18%):</span>
                <span className="font-semibold">
                  ₪{(cart.totalPrice - cart.totalPrice / 1.18).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-2xl font-bold text-gray-900 my-4">
              <span>סה״כ:</span>
              <span>₪{cart.totalPrice.toFixed(2)}</span>
            </div>

            <Link
              href="/carpenter/checkout"
              className="block text-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition mb-3"
            >
              ✅ המשך לתשלום
            </Link>

            <button
              onClick={() => cart.clearCart()}
              className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              🗑️ רוקן עגלה
            </button>
          </div>

          {/* Back to Catalog */}
          <Link
            href="/carpenter/catalog"
            className="block text-center px-6 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-semibold transition"
          >
            ← המשך קניות
          </Link>
        </div>
      </div>
    </div>
  )
}
