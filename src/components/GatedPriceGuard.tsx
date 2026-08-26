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
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
        🔐 {fallbackText}
      </div>
    )
  }

  return <>{children}</>
}

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
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
        🔐 התחבר לצפייה במחירים
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
        ₪{priceInclVat.toFixed(2)}
      </div>
      {showVat && (
        <div className="text-xs text-gray-500 font-medium">
          כולל מע&quot;מ 18% • ₪{priceExclVat.toFixed(2)} ללא מע&quot;מ
        </div>
      )}
    </div>
  )
}
