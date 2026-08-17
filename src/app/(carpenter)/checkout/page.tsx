'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { PriceDisplay } from '@/components/GatedPriceGuard'

// Mock checkout data
const mockCheckoutData = {
  customer: {
    name: 'דב מתל אביב',
    email: 'dov@example.com',
    phone: '050-1234567',
    company: 'דב & בנו',
  },
  items: [
    {
      supplierName: 'דבקי איתמיר',
      product: 'דבק PVA חזק',
      priceExclVat: 120,
      quantity: 5,
    },
    {
      supplierName: 'דבקי איתמיר',
      product: 'דבק פוליוריתן',
      priceExclVat: 180,
      quantity: 2,
    },
    {
      supplierName: 'חוטי סיב דרום',
      product: 'חוט nylon',
      priceExclVat: 25,
      quantity: 10,
    },
  ],
  subOrders: [
    {
      supplierId: '1',
      supplierName: 'דבקי איתמיר',
      exclVat: 720,
    },
    {
      supplierId: '2',
      supplierName: 'חוטי סיב דרום',
      exclVat: 250,
    },
  ],
}

export default function CheckoutPage() {
  const [selectedPayment, setSelectedPayment] = useState<'credit' | 'transfer' | null>(null)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)

  const isAuthenticated = true

  // חשב סה"כ
  const totalExclVat = mockCheckoutData.subOrders.reduce((sum, so) => sum + so.exclVat, 0)
  const vat = totalExclVat * 0.18
  const totalInclVat = totalExclVat + vat

  const handleSubmitOrder = async () => {
    if (!address.trim()) {
      alert('אנא הזן כתובת משלוח')
      return
    }
    if (!selectedPayment) {
      alert('אנא בחר שיטת תשלום')
      return
    }

    setIsProcessing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsProcessing(false)
    setOrderSubmitted(true)
  }

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userRole="carpenter" userName="דב & בנו" cartCount={0} />

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h1 className="text-4xl font-bold text-green-600 mb-4">✅ ההזמנה התקבלה!</h1>
            <p className="text-lg text-gray-700 mb-6">
              תודה על הזמנתך. מספר ההזמנה שלך: <strong>#ORD-2026-001234</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <p className="text-sm text-gray-600">
                📧 הודעה אישור נשלחה ל-<strong>{mockCheckoutData.customer.email}</strong>
              </p>
              <p className="text-sm text-gray-600">
                📱 נוכל ליצור קשר אתך בטלפון <strong>{mockCheckoutData.customer.phone}</strong>
              </p>
            </div>
            <a
              href="/catalog"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded font-semibold hover:bg-blue-700"
            >
              ← חזור לקטלוג
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole="carpenter" userName="דב & בנו" cartCount={0} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">💳 סיום הזמנה</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Customer Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">📋 פרטיך</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">שם</label>
                  <input
                    type="text"
                    defaultValue={mockCheckoutData.customer.name}
                    readOnly
                    className="w-full px-4 py-2 border rounded bg-gray-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">טלפון</label>
                    <input
                      type="text"
                      defaultValue={mockCheckoutData.customer.phone}
                      readOnly
                      className="w-full px-4 py-2 border rounded bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">מייל</label>
                    <input
                      type="email"
                      defaultValue={mockCheckoutData.customer.email}
                      readOnly
                      className="w-full px-4 py-2 border rounded bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">שם העסק</label>
                  <input
                    type="text"
                    defaultValue={mockCheckoutData.customer.company}
                    readOnly
                    className="w-full px-4 py-2 border rounded bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">📍 כתובת משלוח</h3>
              <div className="space-y-4">
                <textarea
                  placeholder="עיר, רחוב, מספר בית, חלק נוסף..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
            </div>

            {/* Step 3: Special Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">📝 הערות נוספות (אופציונלי)</h3>
              <textarea
                placeholder="דרישות מיוחדות, הנחיות קבלה, או כל הערה חשובה..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* Step 4: Payment Method */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">💰 שיטת תשלום</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="credit"
                    checked={selectedPayment === 'credit'}
                    onChange={(e) => setSelectedPayment(e.target.value as any)}
                  />
                  <span>💳 כרטיס אשראי</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="transfer"
                    checked={selectedPayment === 'transfer'}
                    onChange={(e) => setSelectedPayment(e.target.value as any)}
                  />
                  <span>🏦 העברה בנקאית</span>
                </label>
              </div>
            </div>

            {/* Order Items Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">📦 פריטים בהזמנה</h3>
              <div className="space-y-3">
                {mockCheckoutData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between pb-3 border-b last:border-b-0">
                    <div>
                      <p className="font-semibold">{item.product}</p>
                      <p className="text-sm text-gray-600">{item.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₪{(item.priceExclVat * item.quantity * 1.18).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{item.quantity} יח'</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8 space-y-6">
              <h3 className="text-xl font-bold">📊 סיכום הזמנה</h3>

              {/* Sub-orders */}
              <div className="space-y-3 text-sm">
                {mockCheckoutData.subOrders.map((subOrder) => (
                  <div key={subOrder.supplierId}>
                    <p className="text-gray-600">{subOrder.supplierName}</p>
                    <p className="font-semibold">₪{(subOrder.exclVat * 1.18).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">סכום בלי מע"מ:</span>
                  <span>₪{totalExclVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">מע"מ 18%:</span>
                  <span className="text-green-600 font-semibold">₪{vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>סה"כ לתשלום:</span>
                  <span className="text-blue-600">₪{totalInclVat.toFixed(2)}</span>
                </div>
              </div>

              {/* Warnings */}
              {!address.trim() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-700">⚠️ אנא הזן כתובת משלוח</p>
                </div>
              )}
              {!selectedPayment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-700">⚠️ אנא בחר שיטת תשלום</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={isProcessing || !address.trim() || !selectedPayment}
                className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? '⏳ מעבדת...' : '✅ אישור הזמנה'}
              </button>

              {/* Back to Cart */}
              <a
                href="/cart"
                className="block text-center text-blue-600 hover:underline text-sm"
              >
                ← חזור לעגלה
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
