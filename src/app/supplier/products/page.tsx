'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name_he: string
  name_en: string
  base_price_excl_vat: number
  stock_qty: number
  category: string
  active: boolean
}

export default function ProductsManagementPage() {
  const [products] = useState<Product[]>([
    {
      id: '1',
      name_he: 'דבק דקורטיבי',
      name_en: 'Decorative Adhesive',
      base_price_excl_vat: 45,
      stock_qty: 150,
      category: 'דבקים',
      active: true
    },
    {
      id: '2',
      name_he: 'דבק פוליוריתן',
      name_en: 'Polyurethane Adhesive',
      base_price_excl_vat: 65,
      stock_qty: 80,
      category: 'דבקים',
      active: true
    },
    {
      id: '3',
      name_he: 'דבק אפוקסי',
      name_en: 'Epoxy Adhesive',
      base_price_excl_vat: 120,
      stock_qty: 0,
      category: 'דבקים',
      active: false
    }
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">📦 ניהול מוצרים</h1>
          <p className="text-gray-600 mt-2">ניהול קטלוג המוצרים שלך</p>
        </div>
        <Link
          href="/supplier/products/new"
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition"
        >
          ➕ הוסף מוצר חדש
        </Link>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">שם מוצר</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">קטגוריה</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">מחיר בסיס</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">מלאי</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">סטטוס</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name_he}</p>
                      <p className="text-sm text-gray-500">{product.name_en}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₪{product.base_price_excl_vat.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${product.stock_qty > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {product.stock_qty} יח׳
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        product.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.active ? '🟢 פעיל' : '🔴 כבוי'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/supplier/products/${product.id}`}
                        className="px-3 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-xs font-semibold transition"
                      >
                        ערוך
                      </Link>
                      <button className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-semibold transition">
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State Info */}
      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-2xl text-gray-600 mb-4">עדיין אין מוצרים</p>
          <Link
            href="/supplier/products/new"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
          >
            ➕ הוסף את המוצר הראשון שלך
          </Link>
        </div>
      )}
    </div>
  )
}
