'use client'

import { useState } from 'react'
import {
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface StripePaymentFormProps {
  amount: number
  orderId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function StripePaymentForm({
  amount,
  orderId,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?orderId=${orderId}`,
      },
    })

    if (error) {
      setErrorMessage(error.message || 'Payment failed')
      onError?.(error.message || 'Payment failed')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LinkAuthenticationElement />
      <PaymentElement />

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-green-600 text-white font-bold rounded-xl hover:from-amber-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? '⏳ עיבוד תשלום...' : `💳 שלם ₪${amount.toFixed(2)}`}
      </button>
    </form>
  )
}
