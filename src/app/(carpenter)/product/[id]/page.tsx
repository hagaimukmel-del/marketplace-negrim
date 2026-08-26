'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PriceDisplay } from '@/components/GatedPriceGuard'
import VolumePricingTable from '@/components/VolumePricingTable'

// Mock data
const mockProduct = {
  id: '1',
  name: 'דבק PVA חזק',
  supplierName: 'דבקי איתמיר',
  priceExclVat: 120,
  description: 'דבק חזק וחסון להדבקת עץ, קח חיצוני וקורים. לא דורש דחיסה ארוכה.',
  imageUrl: undefined,
  rating: 4.95,
  returnRate: 0.012,
  stock: 500,
  pricingTiers: [
    { minQty: 1, maxQty: 10, priceExclVat: 120 },
    { minQty: 11, maxQty: 50, priceExclVat: 115 },
    { minQty: 51, maxQty: 100, priceExclVat: 110 },
    { minQty: 101, maxQty: 999999, priceExclVat: 105 },
  ],
}

const mockReviews = [
  {
    id: '1',
    author: 'דב מתל אביב',
    rating: 5,
    comment: 'דבק מעולה! השתמשתי לשנים',
    date: '20/08/2026',
  },
  {
    id: '2',
    author: 'מוזל בנייה',
    rating: 4,
    comment: 'טוב, אבל יקר קצת',
    date: '18/08/2026',
  },
]

export default function ProductPage() {
  const params = useParams()
  const productId = params.id
  const [quantity, setQuantity] = useState(1)
  const [isAuthenticated] = useState(false)

  // מצא tier הנכון לכמות
  const activeTier = mockProduct.pricingTiers.find(
    (t) => quantity >= t.minQty && quantity <= t.maxQty
  )

  const currentPrice = activeTier?.priceExclVat || mockProduct.priceExclVat
  const totalExclVat = currentPrice * quantity
  const totalInclVat = totalExclVat * 1.18

  const stars = '⭐'.repeat(Math.round(mockProduct.rating))
  const returnPercentage = (mockProduct.returnRate * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole="carpenter" userName="דב & בנו" cartCount={0} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600 mb-6">
          📍 <a href="/catalog" className="hover:text-blue-600">קטלוג</a> / {mockProduct.name}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Image */}
          <div>
            <div className="bg-gray-200 aspect-square rounded-lg flex items-center justify-center text-4xl text-gray-400">
              📦
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">📊 מלאי זמין: {mockProduct.stock} יח'</p>
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {/* Title & Supplier */}
            <div>
              <h1 className="text-4xl font-bold mb-2">{mockProduct.name}</h1>
              <p className="text-lg text-gray-600">🏢 {mockProduct.supplierName}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <span className="text-2xl">{stars}</span>
              <span className="font-semibold">{mockProduct.rating.toFixed(2)}/5</span>
              {mockProduct.returnRate > 0.1 && (
                <span className="text-red-600 text-sm">⚠️ {returnPercentage}% החזרות</span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">📝 תיאור</h3>
              <p className="text-gray-700">{mockProduct.description}</p>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">💡 טיפים</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• עבור על שטח נקי</li>
                <li>• השהיה 2-3 שעות לייבוש מלא</li>
                <li>• טמפ' חדר 20-25 מעלות</li>
              </ul>
            </div>

            {/* Pricing & Order */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              {/* Price */}
              <PriceDisplay
                priceExclVat={currentPrice}
                isAuthenticated={isAuthenticated}
              />

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold mb-2">כמות</label>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                  >
                    ➖
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border rounded py-2"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                  >
                    ➕
                  </button>
                </div>
              </div>

              {/* Total */}
              {isAuthenticated && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">סה&quot;כ:</p>
                  <p className="text-2xl font-bold text-blue-600">₪{totalInclVat.toFixed(2)}</p>
                </div>
              )}

              {/* Add to Cart Button */}
              <button className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition">
                ➕ הוסף לעגלה ({quantity} יח')
              </button>
            </div>
          </div>
        </div>

        {/* Volume Pricing */}
        <div className="mt-12 bg-white rounded-lg p-6 border border-gray-200">
          <VolumePricingTable
            tiers={mockProduct.pricingTiers}
            selectedQuantity={quantity}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Reviews */}
        <div className="mt-12 bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-2xl font-bold mb-6">👥 דירוגים ({mockReviews.length})</h3>

          <div className="space-y-4">
            {mockReviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{review.author}</span>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <div className="mb-2">⭐ {'⭐'.repeat(review.rating)}</div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
