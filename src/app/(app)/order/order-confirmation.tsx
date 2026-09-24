'use client'

import { useState } from 'react'
import { SelectedOffer } from './order-search-client'

interface OrderConfirmationProps {
  carpenterId: string
  offer: SelectedOffer
  onComplete: () => void
  onBack: () => void
}

export default function OrderConfirmation({
  carpenterId,
  offer,
  onComplete,
  onBack,
}: OrderConfirmationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const totalExclVat = offer.priceExclVat * offer.quantity
  const vat = totalExclVat * 0.17
  const total = totalExclVat + vat

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/carpenter/order/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carpenterId,
          productId: offer.productId,
          supplierId: offer.supplierId,
          quantity: offer.quantity,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'יצירת הזמנה נכשלה')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'יצירת הזמנה נכשלה')
      }

      setSuccess(`ההזמנה נוצרה בהצלחה!\nמספר: ${data.orderId}`)
      setTimeout(onComplete, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בלתי צפויה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={loading}
        className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:text-slate-400"
      >
        ← חזרה לתוצאות
      </button>

      {/* Confirmation Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900">אישור הזמנה</h2>

        {/* Product Info */}
        <div className="border-b pb-4 space-y-3">
          <div>
            <p className="text-sm text-slate-600">מוצר</p>
            <p className="text-lg font-medium text-slate-900">
              {offer.productName}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">ספק</p>
            <p className="text-lg font-medium text-slate-900">
              {offer.supplierName}
            </p>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">כמות</span>
            <span className="font-medium">{offer.quantity} יחידות</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">מחיר ליחידה (ללא מע"מ)</span>
            <span className="font-medium">₪{offer.priceExclVat}</span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-slate-600">סה״כ ללא מע״מ</span>
            <span className="font-medium">₪{totalExclVat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">מע״מ (17%)</span>
            <span className="font-medium">₪{vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold bg-blue-50 p-3 rounded-lg">
            <span>סה״כ כולל מע״מ</span>
            <span>₪{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        <p className="text-sm text-slate-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ זו הזמנת רכש בלבד. הספק יאשר את ההזמנה וישלח חשבונית.
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 whitespace-pre-wrap">{success}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleConfirm}
            disabled={loading || !!success}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 font-medium transition-colors"
          >
            {loading ? 'יוצר הזמנה...' : 'אשר הזמנה'}
          </button>
          <button
            onClick={onBack}
            disabled={loading || !!success}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:bg-slate-100 font-medium transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
