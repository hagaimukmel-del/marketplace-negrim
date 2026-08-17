'use client'

import { ReactNode } from 'react'

interface GatedPriceGuardProps {
  children: ReactNode
  isAuthenticated: boolean
  price?: number
  priceExclVat?: number
  fallbackText?: string
}

export default function GatedPriceGuard({
  children,
  isAuthenticated,
  price,
  priceExclVat,
  fallbackText = 'התחבר כדי לראות מחירים',
}: GatedPriceGuardProps) {
  if (!isAuthenticated) {
    return (
      <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
        🔐 {fallbackText}
      </div>
    )
  }

  return <>{children}</>
}

// עזר לתצוגת מחיר עם VAT
interface PriceDisplayProps {
  priceExclVat: number
  isAuthenticated: boolean
  showVat?: boolean
}

export function PriceDisplay({
  priceExclVat,
  isAuthenticated,
  showVat = true,
}: PriceDisplayProps) {
  const vatRate = 0.18
  const priceInclVat = priceExclVat * (1 + vatRate)

  if (!isAuthenticated) {
    return (
      <div className="text-sm text-gray-500">
        🔐 התחבר לצפייה במחירים
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-lg font-bold text-blue-600">
        ₪{priceInclVat.toFixed(2)}
      </div>
      {showVat && (
        <div className="text-xs text-gray-600">
          (₪{priceExclVat.toFixed(2)} לפני מע"מ 18%)
        </div>
      )}
    </div>
  )
}
