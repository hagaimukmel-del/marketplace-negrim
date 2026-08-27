'use client'

import React, { createContext, useContext, useState } from 'react'

export interface OrderForm {
  name: string
  email: string
  phone: string
  businessName: string
  address: string
  city: string
  zipCode: string
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cash'
}

interface CheckoutContextType {
  formData: Partial<OrderForm>
  updateForm: (data: Partial<OrderForm>) => void
  submitOrder: (items: any[], total: number) => Promise<{ orderId: string }>
  isSubmitting: boolean
  error: string | null
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined)

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<Partial<OrderForm>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateForm = (data: Partial<OrderForm>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const submitOrder = async (items: any[], total: number) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.email || !formData.phone || !formData.name) {
        throw new Error('חסרים פרטים נדרשים')
      }

      // Create order object
      const order = {
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        business_name: formData.businessName || '',
        address: formData.address || '',
        city: formData.city || '',
        zip_code: formData.zipCode || '',
        payment_method: formData.paymentMethod || 'credit_card',
        total_amount: total,
        items_json: JSON.stringify(items),
      }

      // Submit to API endpoint
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const result = await response.json()

      console.log('✅ Order submitted:', result.orderNumber)

      return { orderId: result.orderId }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'שגיאה בשליחת ההזמנה'
      setError(errorMsg)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CheckoutContext.Provider
      value={{
        formData,
        updateForm,
        submitOrder,
        isSubmitting,
        error,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider')
  }
  return context
}
