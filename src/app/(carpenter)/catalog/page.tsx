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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📦</span>
            <h1 className="text-4xl font-bold text-gray-900">קטלוג מוצרים</h1>
          </div>
          <p className="text-lg text-gray-600">
            {filteredProducts.length} מוצרים זמינים לבחירתך
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
            <input
              type="text"
              placeholder="חיפוש מוצר, שם ספק, או קוד..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3.5 pl-4 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-5 py-2.5 rounded-full whitespace-nowrap font-semibold transition-all duration-200 text-sm
                ${selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-xl font-semibold mb-2">לא נמצאו מוצרים</p>
            <p className="text-gray-400">נסה חיפוש אחר או שנה את הסינון</p>
          </div>
        )}

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <div className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg max-w-sm">
            <div className="flex items-start gap-4">
              <span className="text-2xl">🔐</span>
              <div className="flex-1">
                <p className="font-semibold mb-2">התחבר כדי להמשיך</p>
                <p className="text-sm text-blue-100 mb-4">ראה מחירים, הוסף לעגלה וטמן הזמנות</p>
                <a href="/login" className="inline-block bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200">
                  התחברות
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
