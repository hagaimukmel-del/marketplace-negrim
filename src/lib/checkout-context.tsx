'use client'

import React, { createContext, useContext, useState } from 'react'
import type { CartItem } from './cart-context'

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
  submitOrder: (items: CartItem[]) => Promise<{ orderId: string }>
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

  const submitOrder = async (items: CartItem[]) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.email || !formData.phone || !formData.name) {
        throw new Error('חסרים פרטים נדרשים')
      }

      if (items.length === 0) {
        throw new Error('הסל ריק')
      }

      // Only ids and quantities are sent. The server reads the current price
      // from the database and snapshots it onto the order, so the browser
      // cannot name its own price, and no total is trusted from here.
      const order = {
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        business_name: formData.businessName || null,
        address: formData.address || null,
        city: formData.city || null,
        zip_code: formData.zipCode || null,
        payment_method: formData.paymentMethod || null,
        items: items.map((item) => ({
          id: item.id,
          name_he: item.name_he,
          name_en: item.name_en,
          base_price_excl_vat: item.base_price_excl_vat,
          quantity: item.quantity,
        })),
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
