'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'

// דוגמה ל-mock data (בעתיד — מSupabase)
const mockProducts = [
  {
    id: '1',
    name: 'דבק PVA חזק',
    supplierName: 'דבקי איתמיר',
    priceExclVat: 120,
    imageUrl: undefined,
    rating: 4.95,
    returnRate: 0.012,
  },
  {
    id: '2',
    name: 'דבק אפוקסי',
    supplierName: 'חברת דבקים ישראלית',
    priceExclVat: 250,
    imageUrl: undefined,
    rating: 4.2,
    returnRate: 0.133,
  },
  {
    id: '3',
    name: 'דבק פוליוריתן',
    supplierName: 'מפעל דבקים מרכז',
    priceExclVat: 180,
    imageUrl: undefined,
    rating: 4.5,
    returnRate: 0.05,
  },
  {
    id: '4',
    name: 'דבק UF',
    supplierName: 'דבקי איתמיר',
    priceExclVat: 200,
    imageUrl: undefined,
    rating: 2.1,
    returnRate: 0.2,
  },
  {
    id: '5',
    name: 'חוט nylon',
    supplierName: 'חוטי סיב דרום',
    priceExclVat: 25,
    imageUrl: undefined,
    rating: 4.7,
    returnRate: 0.01,
  },
]

const categories = [
  { id: 'all', name: '🏷️ הכל' },
  { id: 'adhesives', name: '🧴 דבקים' },
  { id: 'threads', name: '🧵 חוטים' },
  { id: 'nails', name: '📌 מסמרים' },
  { id: 'tools', name: '🪚 כלים' },
]

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // סינון לפי קטגוריה וחיפוש
  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || true // בעתיד: לפי קטגוריה בDB

    return matchesSearch && matchesCategory
  })

  const handleAddToCart = (productId: string) => {
    setCart([...cart, productId])
    // בעתיד: POST /api/cart
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        userRole="carpenter"
        userName="דב & בנו"
        cartCount={cart.length}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">📦 קטלוג מוצרים</h1>
          <p className="text-gray-600">
            {filteredProducts.length} מוצרים זמינים
          </p>
        </div>

        {/* Search Bar */}
        <div className="my-6">
          <input
            type="text"
            placeholder="🔍 חיפוש מוצר, שם ספק, או קוד..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-4 py-2 rounded whitespace-nowrap font-semibold transition
                ${selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }
              `}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                isAuthenticated={isAuthenticated}
                onAddToCart={() => handleAddToCart(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">❌ לא נמצאו מוצרים</p>
            <p className="text-gray-400">נסה חיפוש אחר</p>
          </div>
        )}

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 mb-4">
              🔐 התחבר כדי לראות מחירים ולהוסיף לעגלה
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
              התחברות
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
