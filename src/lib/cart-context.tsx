'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  id: string
  name_he: string
  name_en: string
  base_price_excl_vat: number
  quantity: number
  addedAt: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'addedAt' | 'quantity'>, quantity: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  logEvent: (action: string, data?: any) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cart-items')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load cart:', e)
      }
    }
    setMounted(true)
  }, [])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('cart-items', JSON.stringify(items))
      logEvent('cart_updated', { itemCount: items.length, total: calculateTotal() })
    }
  }, [items, mounted])

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.base_price_excl_vat * item.quantity * 1.18, 0)
  }

  const addItem = (item: Omit<CartItem, 'addedAt' | 'quantity'>, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        logEvent('item_quantity_updated', {
          product: item.name_he,
          oldQty: existing.quantity,
          newQty: existing.quantity + quantity,
        })
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      logEvent('item_added_to_cart', {
        product: item.name_he,
        price: item.base_price_excl_vat,
        quantity,
      })
      return [
        ...prev,
        {
          ...item,
          quantity,
          addedAt: Date.now(),
        },
      ]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        logEvent('item_removed_from_cart', {
          product: item.name_he,
          quantity: item.quantity,
        })
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        logEvent('quantity_changed', {
          product: item.name_he,
          oldQty: item.quantity,
          newQty: quantity,
        })
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    })
  }

  const clearCart = () => {
    logEvent('cart_cleared', { itemCount: items.length })
    setItems([])
  }

  const logEvent = (action: string, data?: any) => {
    const event = {
      timestamp: new Date().toISOString(),
      action,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }
    console.log('📊 Event:', event)
    // TODO: Send to analytics/logging service
  }

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: calculateTotal(),
    logEvent,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
