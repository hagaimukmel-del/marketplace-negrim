'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/lib/cart-context'

interface Product {
  id: string
  name_he: string
  name_en: string
  name_ar?: string
  description_he?: string
  description_en?: string
  category?: string
  base_price_excl_vat: number
  stock_qty: number
  rating?: number
  return_rate?: number
  image_url?: string
  package_type?: string
  breaks_json?: string
  tds_url?: string
  is_active?: boolean
}

export default function CatalogPage() {
  const cart = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-700 rounded-full"></div>
          </div>
          <p className="text-lg text-gray-700 font-medium">טוען קטלוג...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50">
        <div className="text-center bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <p className="text-lg text-red-600 font-medium mb-4">שגיאה: {error}</p>
          <button
            onClick={fetchProducts}
            className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Modern Futuristic Header */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 backdrop-blur-xl bg-gradient-to-r from-amber-900/20 via-amber-800/20 to-green-800/20 border border-white/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 via-transparent to-green-600/10 opacity-50"></div>
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-900 via-amber-800 to-green-700 bg-clip-text text-transparent mb-3">
                📦 קטלוג דבקים מקצועי
              </h1>
              <p className="text-gray-700 text-lg md:text-xl font-medium">
                בחר מוצרים איכותיים מהטובים בעולם לנגרותך • מחיר תחרותי • משלוח מהיר
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full font-bold shadow-lg">
              {products.length} מוצרים זמינים
            </div>
            <div className="px-6 py-3 bg-white/60 backdrop-blur-lg border border-white/40 text-gray-700 rounded-full font-medium shadow-lg">
              בחר וקבע כמות
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white/50 backdrop-blur-lg rounded-3xl border border-white/30">
            <p className="text-gray-600 text-xl font-medium">אין מוצרים זמינים כרגע</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
            {products.map((product) => {
              const autoRating = product.rating ?? (5.0 - ((product.return_rate ?? 0) * 0.2))
              const priceWithVat = product.base_price_excl_vat * 1.18
              const hasImage = product.image_url && product.image_url.trim() !== ''

              // Parse breaks_json if available
              let quantityBreaks = []
              if (product.breaks_json) {
                try {
                  quantityBreaks = JSON.parse(product.breaks_json)
                } catch (e) {
                  quantityBreaks = []
                }
              }

              return (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/80 hover:-translate-y-2"
                >
                  {/* Gradient Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-white/20 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Image Container */}
                  <div className="relative w-full h-56 md:h-64 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden border-b border-white/30">
                    {hasImage ? (
                      <img
                        src={product.image_url}
                        alt={product.name_he}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 via-amber-50 to-green-100">
                        <span className="text-6xl opacity-30">🛢️</span>
                      </div>
                    )}

                    {/* Top Right Badge - Rating */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/30 font-bold text-amber-900">
                      ⭐ {autoRating.toFixed(2)}
                    </div>

                    {/* Bottom Left Badge - Stock */}
                    <div className="absolute bottom-4 left-4">
                      <div
                        className={`px-4 py-2 rounded-full font-bold text-sm backdrop-blur-md border border-white/30 shadow-lg ${
                          product.stock_qty > 0
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-red-500/90 text-white'
                        }`}
                      >
                        {product.stock_qty > 0 ? `${product.stock_qty} יח׳ במלאי` : '❌ אזל'}
                      </div>
                    </div>

                    {/* Category Tag */}
                    {product.category && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-amber-600/90 text-white text-xs font-bold rounded-full backdrop-blur-md border border-white/20">
                        {product.category}
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="relative z-10 p-5 md:p-6 space-y-4">
                    {/* Product Name */}
                    <div className="space-y-1">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-amber-900 transition-colors">
                        {product.name_he}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 font-medium">
                        {product.name_en}
                      </p>
                      {product.name_ar && (
                        <p className="text-xs text-gray-500">{product.name_ar}</p>
                      )}
                    </div>

                    {/* Description */}
                    {product.description_he && (
                      <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                        {product.description_he}
                      </p>
                    )}

                    {/* Package Info */}
                    {product.package_type && (
                      <div className="flex items-center gap-2 text-sm bg-blue-50/60 border border-blue-100/30 rounded-lg p-2 backdrop-blur-sm">
                        <span className="font-semibold text-blue-900">📦</span>
                        <span className="text-blue-900">{product.package_type}</span>
                      </div>
                    )}

                    {/* Quantity Breaks Display */}
                    {quantityBreaks.length > 0 && (
                      <div className="bg-amber-50/60 border border-amber-100/30 rounded-lg p-3 backdrop-blur-sm">
                        <p className="text-xs font-bold text-amber-900 mb-2">🎁 הנחות כמות:</p>
                        <div className="space-y-1">
                          {quantityBreaks.map((brk: any, idx: number) => (
                            <div key={idx} className="text-xs text-amber-900">
                              {brk.min_qty}{brk.max_qty ? `-${brk.max_qty}` : '+'} יח׳: {brk.discount_percent}% הנחה
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price Section */}
                    <div className="bg-gradient-to-r from-amber-50/70 to-green-50/70 rounded-xl p-4 border border-white/40 backdrop-blur-sm">
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">💰 מחיר ליחידה:</p>
                          <span className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-900 to-green-700 bg-clip-text text-transparent">
                            ₪{priceWithVat.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-700">
                          <p className="mb-1 font-semibold">כולל מע״מ</p>
                          <p className="text-gray-600">ללא: ₪{product.base_price_excl_vat.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* TDS/Technical Sheet Link */}
                    {product.tds_url && (
                      <a
                        href={product.tds_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50/70 border border-blue-200/50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium backdrop-blur-sm"
                      >
                        📄 הורד דף TDS
                      </a>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-2">
                      <button
                        onClick={() =>
                          setQuantities((p) => ({
                            ...p,
                            [product.id]: Math.max(1, (p[product.id] || 1) - 1),
                          }))
                        }
                        className="flex-1 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded transition-colors"
                        title="הקטן כמות"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantities[product.id] || 1}
                        onChange={(e) =>
                          setQuantities((p) => ({
                            ...p,
                            [product.id]: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        className="w-16 text-center font-bold text-lg outline-none bg-transparent"
                      />
                      <button
                        onClick={() =>
                          setQuantities((p) => ({
                            ...p,
                            [product.id]: (p[product.id] || 1) + 1,
                          }))
                        }
                        className="flex-1 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded transition-colors"
                        title="הגדל כמות"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => {
                        cart.addItem(
                          {
                            id: product.id,
                            name_he: product.name_he,
                            name_en: product.name_en,
                            base_price_excl_vat: product.base_price_excl_vat,
                          },
                          quantities[product.id] || 1
                        )
                        setQuantities((p) => ({ ...p, [product.id]: 1 }))
                      }}
                      disabled={product.stock_qty <= 0}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-green-600 text-white font-bold rounded-xl hover:from-amber-700 hover:to-green-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      {product.stock_qty > 0 ? '🛒 הוסף לסל' : 'אזל מהמלאי'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
