'use client'

import { PriceDisplay } from './GatedPriceGuard'

interface PricingTier {
  minQty: number
  maxQty: number
  priceExclVat: number
}

interface VolumePricingTableProps {
  tiers: PricingTier[]
  selectedQuantity: number
  isAuthenticated: boolean
}

export default function VolumePricingTable({
  tiers,
  selectedQuantity,
  isAuthenticated,
}: VolumePricingTableProps) {
  if (!tiers || tiers.length === 0) {
    return null
  }

  // מיין לפי minQty
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty)

  // מצא את המחיר הפעיל
  const activeTier = sortedTiers.find(
    (t) => selectedQuantity >= t.minQty && selectedQuantity <= t.maxQty
  )

  const getSavings = (tier: PricingTier, baseTier: PricingTier) => {
    if (baseTier.priceExclVat <= tier.priceExclVat) return 0
    const savings = ((baseTier.priceExclVat - tier.priceExclVat) / baseTier.priceExclVat) * 100
    return savings.toFixed(1)
  }

  const baseTier = sortedTiers[0]

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">📊 הנחות לכמות</h3>

      {/* טבלה */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-right">כמות</th>
              <th className="border p-2 text-right">מחיר ליח'</th>
              <th className="border p-2 text-right">הנחה</th>
              <th className="border p-2 text-right">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {sortedTiers.map((tier, idx) => {
              const isActive = activeTier?.minQty === tier.minQty
              const savings = idx > 0 ? getSavings(tier, baseTier) : 0
              const totalExclVat = tier.priceExclVat * selectedQuantity
              const totalInclVat = totalExclVat * 1.18

              return (
                <tr
                  key={`${tier.minQty}-${tier.maxQty}`}
                  className={`
                    border ${isActive ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'}
                  `}
                >
                  <td className="border p-2">
                    {tier.minQty} - {tier.maxQty === 999999 ? '∞' : tier.maxQty}
                  </td>
                  <td className="border p-2">
                    {isAuthenticated ? (
                      <span className="font-semibold">₪{tier.priceExclVat.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-500">🔐</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {savings > 0 ? (
                      <span className="text-green-600 font-semibold">-{savings}%</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="border p-2">
                    {isAuthenticated ? (
                      <span>₪{totalInclVat.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-500">🔐</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* הערה על המחיר הפעיל */}
      {isAuthenticated && activeTier && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm">
            ✅ <strong>מחיר פעיל לכמות {selectedQuantity}:</strong>{' '}
            <span className="font-semibold">₪{activeTier.priceExclVat.toFixed(2)} ליח'</span>
          </p>
        </div>
      )}
    </div>
  )
}
