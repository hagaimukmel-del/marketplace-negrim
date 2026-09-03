'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'

declare global {
  namespace window {
    function paypal: any
  }
}

export default function PaymentPage() {
  const cart = useCart()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') || 'ORD-' + Date.now()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(false)

  const totalAmount = cart.totalPrice

  useEffect(() => {
    if (scriptReady && window.paypal) {
      window.paypal
        .Buttons({
          createOrder: async (data: any, actions: any) => {
            try {
              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: totalAmount.toFixed(2),
                  orderId,
                  currency: 'ILS',
                }),
              })

              const result = await response.json()
              if (!response.ok) throw new Error(result.message)

              return result.id
            } catch (error: any) {
              setError(error.message)
              throw error
            }
          },

          onApprove: async (data: any, actions: any) => {
            try {
              const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: data.orderID,
                  orderId,
                }),
              })

              const result = await response.json()
              if (!response.ok) throw new Error(result.message)

              // Redirect to success page
              window.location.href = `/payment-success?orderId=${orderId}`
            } catch (error: any) {
              setError(error.message)
            }
          },

          onError: (error: any) => {
            setError('שגיאה בתשלום. אנא נסה שוב.')
            console.error('PayPal error:', error)
          },
        })
        .render('#paypal-container')
        .catch((error: any) => {
          setError('שגיאה בטעינת PayPal. אנא רענן את הדף.')
          console.error('PayPal render error:', error)
        })
    }

    setLoading(false)
  }, [scriptReady, totalAmount, orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-700 rounded-full"></div>
          </div>
          <p className="text-lg text-gray-700 font-medium">טוען עמוד תשלום...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <p className="text-lg text-red-600 font-medium mb-4">❌ שגיאה</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=ILS"
        onLoad={() => setScriptReady(true)}
      />

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-12 px-4 md:px-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 backdrop-blur-xl bg-gradient-to-r from-amber-900/20 via-amber-800/20 to-green-800/20 border border-white/30 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-900 via-amber-800 to-green-700 bg-clip-text text-transparent mb-3">
              💳 תשלום
            </h1>
            <p className="text-gray-700 text-lg">בחר דרך תשלום והשלם בבטחה</p>
          </div>

          {/* Order Summary */}
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 סיכום הזמנה</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between">
                <span>מספר הזמנה:</span>
                <span className="font-semibold text-amber-900">#{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>סכום סה״כ:</span>
                <span className="font-bold text-lg text-green-700">
                  ₪{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                (כולל מע״מ 18%)
              </div>
            </div>
          </div>

          {/* PayPal Container */}
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🌐 בחר דרך תשלום</h2>
            <div id="paypal-container" className="min-h-[200px]">
              <div className="text-center text-gray-500 py-8">
                טוען אפשרויות תשלום...
              </div>
            </div>
          </div>

          {/* Security Info */}
          <div className="bg-blue-50/60 border border-blue-100/40 rounded-xl p-4 text-sm text-blue-900">
            🔒 התשלום מעובד בצורה מאובטחת דרך PayPal. הנתונים הפיננסיים שלך מאובטחים במלואו.
          </div>

          {/* Payment Methods */}
          <div className="bg-amber-50/60 border border-amber-100/40 rounded-xl p-4 text-sm">
            <p className="font-semibold text-amber-900 mb-2">✅ דרכי תשלום:</p>
            <ul className="text-amber-900 space-y-1">
              <li>💳 כרטיס אשראי/חיוב</li>
              <li>🏦 PayPal</li>
              <li>📱 ארנקים דיגיטליים</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
