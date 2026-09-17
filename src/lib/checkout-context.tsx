'use client'

import React, { createContext, useContext, useState } from 'react'
import type { CartItem } from './cart-context'
import { getCarpenterToken } from './carpenter-session'

export type PaymentTerms = 'שוטף+30' | 'שוטף+60' | 'מזומן במסירה'

export interface OrderForm {
  name: string
  email: string
  phone: string
  businessName: string
  address: string
  city: string
  zipCode: string
  /**
   * Requested payment terms, not a payment method. The supplier is the seller
   * of record: it sets the terms and invoices the carpenter directly, and no
   * money moves through this platform. The old union — credit_card /
   * bank_transfer / cash — described a checkout that does not exist.
   */
  paymentTerms: PaymentTerms
}

/** One checkout becomes one purchase order per supplier. */
export interface SubmittedCheckout {
  checkoutId: string
  orders: { id: string; orderNumber: string }[]
}

interface CheckoutContextType {
  /**
   * The form is passed in rather than held here. It used to live in this
   * provider, which meant submitting read whatever the last render had written
   * — and a page that seeds its fields from the server would have raced it.
   */
  submitOrder: (items: CartItem[], form: OrderForm) => Promise<SubmittedCheckout>
  isSubmitting: boolean
  error: string | null
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined)

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitOrder = async (items: CartItem[], formData: OrderForm) => {
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
        // Attributes the order when this browser has been through an offer
        // link. The server re-resolves it; nothing here is taken on trust.
        token: getCarpenterToken(),
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        business_name: formData.businessName || null,
        address: formData.address || null,
        city: formData.city || null,
        zip_code: formData.zipCode || null,
        payment_method: formData.paymentTerms || null,
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

      return { checkoutId: result.checkoutId, orders: result.orders }
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
