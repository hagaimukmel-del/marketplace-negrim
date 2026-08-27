'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useCheckout } from '@/lib/checkout-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const cart = useCart()
  const checkout = useCheckout()
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form')

  if (cart.items.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">📋 Checkout</h1>
        <div className="text-center py-12">
          <p className="text-2xl text-gray-600 mb-6">העגלה שלך ריקה</p>
          <Link
            href="/carpenter/catalog"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← חזור לקטלוג
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const { orderId } = await checkout.submitOrder(cart.items, cart.totalPrice)
      setStep('success')
      // Clear cart after successful order
      setTimeout(() => {
        cart.clearCart()
        router.push(`/carpenter/orders/${orderId}`)
      }, 2000)
    } catch (err) {
      console.error('Checkout error:', err)
    }
  }

  if (step === 'success') {
    return (
      <div className="space-y-8 text-center py-12">
        <div className="text-6xl">✅</div>
        <h1 className="text-4xl font-bold text-gray-900">ההזמנה אושרה!</h1>
        <p className="text-xl text-gray-600">מעביר אותך לעמוד ההזמנה...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
        <h1 className="text-4xl font-bold text-gray-900">📋 סיום הזמנה</h1>
        <p className="text-gray-700 mt-2">שלב {step === 'form' ? '1' : '2'}: {step === 'form' ? 'פרטים אישיים' : 'סקירה'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 פרטים אישיים</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">שם מלא *</label>
                    <input
                      type="text"
                      required
                      value={checkout.formData.name || ''}
                      onChange={(e) => checkout.updateForm({ name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="דב כהן"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">מייל *</label>
                    <input
                      type="email"
                      required
                      value={checkout.formData.email || ''}
                      onChange={(e) => checkout.updateForm({ email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="dov@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">טלפון *</label>
                    <input
                      type="tel"
                      required
                      value={checkout.formData.phone || ''}
                      onChange={(e) => checkout.updateForm({ phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="050-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">שם העסק</label>
                    <input
                      type="text"
                      value={checkout.formData.businessName || ''}
                      onChange={(e) => checkout.updateForm({ businessName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="נגרות כהן"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🏠 כתובת משלוח</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">כתובת *</label>
                    <input
                      type="text"
                      required
                      value={checkout.formData.address || ''}
                      onChange={(e) => checkout.updateForm({ address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="רחוב הנגר 123"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">עיר *</label>
                      <input
                        type="text"
                        required
                        value={checkout.formData.city || ''}
                        onChange={(e) => checkout.updateForm({ city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="תל אביב"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">מיקוד</label>
                      <input
                        type="text"
                        value={checkout.formData.zipCode || ''}
                        onChange={(e) => checkout.updateForm({ zipCode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="69000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">💳 שיטת תשלום</h2>

                <div className="space-y-3">
                  {(['credit_card', 'bank_transfer', 'cash'] as const).map((method) => (
                    <label key={method} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={checkout.formData.paymentMethod === method}
                        onChange={(e) => checkout.updateForm({ paymentMethod: e.target.value as any })}
                        className="w-4 h-4"
                      />
                      <span className="ml-3 font-semibold text-gray-700">
                        {method === 'credit_card' && '💳 כרטיס אשראי'}
                        {method === 'bank_transfer' && '🏦 העברה בנקאית'}
                        {method === 'cash' && '💰 בתשלום'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {checkout.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {checkout.error}
                </div>
              )}

              <button
                type="submit"
                disabled={checkout.isSubmitting}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {checkout.isSubmitting ? '⏳ שולח...' : '✅ אישור ושליחה'}
              </button>
            </form>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 h-fit sticky top-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">סיכום הזמנה</h2>

          <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name_he} ×{item.quantity}</span>
                <span className="font-semibold">₪{(item.base_price_excl_vat * 1.18 * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-gray-600">
              <span>ללא מע״מ:</span>
              <span>₪{(cart.totalPrice / 1.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>מע״מ 18%:</span>
              <span>₪{(cart.totalPrice - cart.totalPrice / 1.18).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-2xl font-bold text-gray-900 my-4">
            <span>סה״כ:</span>
            <span>₪{cart.totalPrice.toFixed(2)}</span>
          </div>

          <Link
            href="/carpenter/cart"
            className="block text-center px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            ← חזור לעגלה
          </Link>
        </div>
      </div>
    </div>
  )
}
