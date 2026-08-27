'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Product {
  id: string
  name_he: string
  name_en: string
  description_he: string
  base_price_excl_vat: number
  stock_qty: number
  rating: number
  return_rate: number
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">טוען קטלוג...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">שגיאה: {error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
        <h1 className="text-4xl font-bold text-gray-900">📦 קטלוג דבקים</h1>
        <p className="text-gray-700 mt-2">בחר מוצרים איכותיים לנגרותך</p>
      </div>

      {/* Product Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">מוצרים פעילים</h2>
        <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold">
          {products.length} מוצרים
        </span>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">אין מוצרים זמינים כרגע</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const autoRating = 5.0 - (product.return_rate * 0.2)
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Product Card */}
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{product.name_he}</h3>
                    <p className="text-sm text-gray-500 mt-1">{product.name_en}</p>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-semibold text-amber-600">
                      ⭐ {autoRating.toFixed(2)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm">{product.description_he}</p>

                  {/* Stock */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">במלאי:</span>
                    <span
                      className={`font-semibold ${
                        product.stock_qty > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {product.stock_qty} יח&apos;
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ₪{(product.base_price_excl_vat * 1.18).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500">עם מע״מ</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {product.base_price_excl_vat.toFixed(2)} ₪ בלי מע״מ
                    </p>
                  </div>

                  {/* Action Button */}
                  <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition">
                    🛒 הוסף לסל
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
