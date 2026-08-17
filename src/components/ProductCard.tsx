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
  const displayRating = Math.max(1, 5 - returnRate * 0.2)
  const stars = '⭐'.repeat(Math.round(displayRating))
  const returnPercentage = (returnRate * 100).toFixed(1)

  return (
    <Link href={`/product/${id}`}>
      <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden h-full flex flex-col hover:border-blue-200">
        {/* Image Container */}
        <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
          {returnRate > 0.1 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg">
              ⚠️ {returnPercentage}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 flex-1 flex flex-col">
          {/* Product Name */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {name}
            </h3>
          </div>

          {/* Supplier */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🏢</span>
            <p className="line-clamp-1">{supplierName}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3 py-2 border-t border-b border-gray-100">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.round(displayRating) ? 'text-yellow-400' : 'text-gray-300'}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {displayRating.toFixed(1)}
            </span>
          </div>

          {/* Price */}
          <div className="mt-auto">
            <PriceDisplay
              priceExclVat={priceExclVat}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              onAddToCart?.()
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg active:scale-95"
          >
            ➕ הוסף לעגלה
          </button>

          {/* Details Link */}
          <Link
            href={`/product/${id}`}
            className="text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            👁️ ראה פרטים מלאים
          </Link>
        </div>
      </div>
    </Link>
  )
}
