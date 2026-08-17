'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { PriceDisplay } from '@/components/GatedPriceGuard'

// Mock cart data (סוגה לפי supplier)
const mockCartData = [
  {
    supplierId: '1',
    supplierName: 'דבקי איתמיר',
    supplierEmail: 'itamir@suppliers.com',
    minOrder: 500,
    items: [
      {
        id: '1',
        name: 'דבק PVA חזק',
        priceExclVat: 120,
        quantity: 5,
      },
      {
        id: '3',
        name: 'דבק פוליוריתן',
        priceExclVat: 180,
        quantity: 2,
      },
    ],
  },
  {
    supplierId: '2',
    supplierName: 'חוטי סיב דרום',
    supplierEmail: 'threads@suppliers.com',
    minOrder: 100,
    items: [
      {
        id: '5',
        name: 'חוט nylon',
        priceExclVat: 25,
        quantity: 10,
      },
    ],
  },
]

export default function CartPage() {
  const [cart, setCart] = useState(mockCartData)
  const [isAuthenticated] = useState(true)

  // חשב סה"כ לספק
  const calculateSupplierTotal = (supplier: typeof mockCartData[0]) => {
    const exclVat = supplier.items.reduce((sum, item) => sum + item.priceExclVat * item.quantity, 0)
    return { exclVat, inclVat: exclVat * 1.18 }
  }

  // חשב סה"כ כללי
  const grandTotal = cart.reduce((sum, supplier) => {
    const { inclVat } = calculateSupplierTotal(supplier)
    return sum + inclVat
  }, 0)

  // בדוק minimum order
  const validateMinOrder = (supplier: typeof mockCartData[0]) => {
    const total = calculateSupplierTotal(supplier).exclVat
    return total >= supplier.minOrder
  }

  // הסר פריט
  const handleRemoveItem = (supplierId: string, itemId: string) => {
    setCart(
      cart
        .map((supplier) =>
          supplier.supplierId === supplierId
            ? {
                ...supplier,
                items: supplier.items.filter((item) => item.id !== itemId),
              }
            : supplier
        )
        .filter((supplier) => supplier.items.length > 0)
    )
  }

  // עדכן כמות
  const handleUpdateQuantity = (supplierId: string, itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(supplierId, itemId)
      return
    }
    setCart(
      cart.map((supplier) =>
        supplier.supplierId === supplierId
          ? {
              ...supplier,
              items: supplier.items.map((item) =>
                item.id === itemId ? { ...item, quantity: newQty } : item
              ),
            }
          : supplier
      )
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole="carpenter" userName="דב & בנו" cartCount={cart.reduce((sum, s) => sum + s.items.length, 0)} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-8">🛒 עגלת קניות</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-500 text-lg mb-4">עגלתך ריקה</p>
            <a href="/catalog" className="text-blue-600 hover:underline">
              ← חזור לקטלוג
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {cart.map((supplier) => {
                const { exclVat, inclVat } = calculateSupplierTotal(supplier)
                const isValidOrder = validateMinOrder(supplier)

                return (
                  <div key={supplier.supplierId} className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Supplier Header */}
                    <div className="mb-6 pb-4 border-b">
                      <h3 className="text-xl font-semibold">🏢 {supplier.supplierName}</h3>
                      <p className="text-sm text-gray-600">
                        {!isValidOrder && (
                          <span className="text-red-600">
                            ⚠️ הזמנה מינימום: ₪{supplier.minOrder} (כרגע: ₪{exclVat.toFixed(2)})
                          </span>
                        )}
                        {isValidOrder && (
                          <span className="text-green-600">✅ עמדה בדרישת הזמנה מינימום</span>
                        )}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                      {supplier.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 pb-4 border-b last:border-b-0">
                          {/* Product Info */}
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              <PriceDisplay priceExclVat={item.priceExclVat} isAuthenticated={isAuthenticated} />
                            </p>
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(supplier.supplierId, item.id, item.quantity - 1)
                              }
                              className="px-2 py-1 border rounded hover:bg-gray-100"
                            >
                              ➖
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  supplier.supplierId,
                                  item.id,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-12 text-center border rounded py-1"
                            />
                            <button
                              onClick={() =>
                                handleUpdateQuantity(supplier.supplierId, item.id, item.quantity + 1)
                              }
                              className="px-2 py-1 border rounded hover:bg-gray-100"
                            >
                              ➕
                            </button>
                          </div>

                          {/* Total */}
                          <div className="text-right w-24">
                            <p className="font-semibold">
                              ₪{(item.priceExclVat * item.quantity * 1.18).toFixed(2)}
                            </p>
                            <button
                              onClick={() => handleRemoveItem(supplier.supplierId, item.id)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              הסר
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Supplier Subtotal */}
                    <div className="mt-6 pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>עמודה מינימום:</span>
                        <span>₪{supplier.minOrder}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>סה"כ ללא מע"מ:</span>
                        <span>₪{exclVat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg text-blue-600">
                        <span>סה"כ עם מע"מ 18%:</span>
                        <span>₪{inclVat.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sidebar: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8 space-y-6">
                <h3 className="text-xl font-bold">📊 סיכום הזמנה</h3>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">מוצרים:</span>
                    <span>{cart.reduce((sum, s) => sum + s.items.length, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ספקים:</span>
                    <span>{cart.length}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>סה"כ כללי:</span>
                    <span className="text-lg text-blue-600">₪{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Warnings */}
                {cart.some((s) => !validateMinOrder(s)) && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">
                      ⚠️ חלק מהספקים לא עומדים בהזמנה מינימום
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  disabled={cart.some((s) => !validateMinOrder(s))}
                  className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  💳 לתשלום
                </button>

                {/* Continue Shopping */}
                <a
                  href="/catalog"
                  className="block text-center text-blue-600 hover:underline text-sm"
                >
                  ← המשך בחירה
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
