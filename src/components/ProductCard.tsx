'use client'

import Image from 'next/image'
import Link from 'next/link'
import { PriceDisplay } from './GatedPriceGuard'

interface ProductCardProps {
  id: string
  name: string
  supplierName: string
  priceExclVat: number
  imageUrl?: string
  rating: number
  returnRate: number
  isAuthenticated: boolean
  onAddToCart?: () => void
}

export default function ProductCard({
  id,
  name,
  supplierName,
  priceExclVat,
  imageUrl,
  rating,
  returnRate,
  isAuthenticated,
  onAddToCart,
}: ProductCardProps) {
  // דירוג מוצר: 5 - (return_rate * 0.2)
  const displayRating = Math.max(1, 5 - returnRate * 0.2)
  const stars = '⭐'.repeat(Math.round(displayRating))

  const returnPercentage = (returnRate * 100).toFixed(1)

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-200 overflow-hidden">
      {/* תמונה */}
      {imageUrl ? (
        <div className="relative w-full h-40 bg-gray-100">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
          📦 אין תמונה
        </div>
      )}

      {/* תוכן */}
      <div className="p-4 space-y-3">
        {/* שם מוצר */}
        <Link href={`/product/${id}`}>
          <h3 className="font-semibold text-lg hover:text-blue-600 line-clamp-2">
            {name}
          </h3>
        </Link>

        {/* ספק */}
        <p className="text-sm text-gray-600">🏢 {supplierName}</p>

        {/* דירוג */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">{stars}</span>
          <span className="text-sm font-semibold">
            {displayRating.toFixed(2)}/5
          </span>
          {returnRate > 0.1 && (
            <span className="text-xs text-red-600 ml-auto">
              ⚠️ {returnPercentage}% החזרות
            </span>
          )}
        </div>

        {/* מחיר */}
        <PriceDisplay
          priceExclVat={priceExclVat}
          isAuthenticated={isAuthenticated}
        />

        {/* כפתור */}
        <button
          onClick={onAddToCart}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-semibold"
        >
          ➕ הוסף לעגלה
        </button>

        {/* קישור לפרטים */}
        <Link
          href={`/product/${id}`}
          className="block text-center text-sm text-blue-600 hover:underline"
        >
          👁️ ראה פרטים
        </Link>
      </div>
    </div>
  )
}
