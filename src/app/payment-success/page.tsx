'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    // You could send an event to analytics here
    console.log('Payment successful for order:', orderId)
  }, [orderId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30 text-center space-y-6">
        {/* Success Icon */}
        <div className="text-6xl">✅</div>

        {/* Title */}
        <h1 className="text-4xl font-black bg-gradient-to-r from-amber-900 to-green-700 bg-clip-text text-transparent">
          תשלום הצליח!
        </h1>

        {/* Message */}
        <div className="space-y-3 text-gray-700">
          <p className="text-lg">
            תודה על הזמנתך! ההזמנה שלך עברה בהצלחה.
          </p>

          {orderId && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-gray-600 mb-1">מספר הזמנה:</p>
              <p className="font-mono font-bold text-amber-900">#{orderId}</p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            אנו נשלח לך אימייל עם פרטי ההזמנה והעבודה בהקדם האפשרי.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/carpenter/orders"
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105"
          >
            📋 הצג הזמנות שלי
          </Link>
          <Link
            href="/carpenter/catalog"
            className="w-full py-3 px-4 bg-white border-2 border-amber-600 text-amber-900 font-bold rounded-xl hover:bg-amber-50 transition-all"
          >
            🛍️ המשך קנייה
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p>שאלות? <a href="mailto:support@example.com" className="text-amber-600 hover:underline">צור קשר איתנו</a></p>
        </div>
      </div>
    </div>
  )
}
