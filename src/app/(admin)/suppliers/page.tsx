// @ts-nocheck
'use client'

import { useState } from 'react'
import Link from 'next/link'

// Mock data
const mockSuppliers = [
  {
    id: '1',
    name: 'דבקי איתמיר',
    email: 'itamir@suppliers.com',
    phone: '050-7575860',
    status: 'active' as const,
    verified: true,
    products: 12,
    orders: 45,
    rating: 4.8,
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    name: 'חוטי סיב דרום',
    email: 'threads@suppliers.com',
    phone: '050-1234567',
    status: 'active' as const,
    verified: true,
    products: 8,
    orders: 23,
    rating: 4.5,
    createdAt: '2026-02-20',
  },
  {
    id: '3',
    name: 'דבקים ישראלית',
    email: 'israeli@suppliers.com',
    phone: '050-9876543',
    status: 'pending' as const,
    verified: false,
    products: 0,
    orders: 0,
    rating: 0,
    createdAt: '2026-08-10',
  },
]

type SupplierStatus = 'active' | 'pending' | 'suspended'

interface ModalState {
  type: 'add' | 'edit' | 'delete' | null
  supplier?: (typeof mockSuppliers)[0]
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(mockSuppliers)
  const [modal, setModal] = useState<ModalState>({ type: null })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'pending' as SupplierStatus,
  })
  const [filter, setFilter] = useState<SupplierStatus | 'all'>('all')

  const filteredSuppliers = filter === 'all'
    ? suppliers
    : suppliers.filter(s => s.status === filter)

  const handleAdd = () => {
    setFormData({ name: '', email: '', phone: '', status: 'pending' })
    setModal({ type: 'add' })
  }

  const handleEdit = (supplier: typeof mockSuppliers[0]) => {
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.status,
    })
    setModal({ type: 'edit', supplier })
  }

  const handleDelete = (supplier: typeof mockSuppliers[0]) => {
    setModal({ type: 'delete', supplier })
  }

  const handleSave = () => {
    if (modal.type === 'add') {
      const newSupplier = {
        id: String(suppliers.length + 1),
        ...formData,
        verified: formData.status === 'active',
        products: 0,
        orders: 0,
        rating: 0,
        createdAt: new Date().toISOString().split('T')[0],
      }
      // @ts-ignore
      setSuppliers([...suppliers, newSupplier])
    } else if (modal.type === 'edit' && modal.supplier) {
      // @ts-ignore
      setSuppliers(
        suppliers.map(s =>
          s.id === modal.supplier!.id
            ? { ...s, ...formData }
            : s
        )
      )
    }
    setModal({ type: null })
  }

  const handleConfirmDelete = () => {
    if (modal.supplier) {
      setSuppliers(suppliers.filter(s => s.id !== modal.supplier!.id))
      setModal({ type: null })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏢 ניהול ספקים</h1>
          <p className="text-gray-600 mt-1">{suppliers.length} ספקים בסך הכל</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition"
        >
          ➕ הוסף ספק חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'pending', 'suspended'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
            }`}
          >
            {status === 'all' && '🏷️ הכל'}
            {status === 'active' && '✅ פעיל'}
            {status === 'pending' && '⏳ בהמתנה'}
            {status === 'suspended' && '🚫 הקפוא'}
            {' '}
            ({filteredSuppliers.length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">שם</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">מייל</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">טלפון</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">סטטוס</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">מוצרים</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">הזמנות</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">דירוג</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{supplier.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.phone}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      supplier.status === 'active' ? 'bg-green-100 text-green-800' :
                      supplier.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {supplier.status === 'active' && '✅ פעיל'}
                      {supplier.status === 'pending' && '⏳ בהמתנה'}
                      {(supplier.status as any) === 'suspended' && '🚫 הקפוא'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{supplier.products}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{supplier.orders}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    {supplier.rating > 0 ? `⭐ ${supplier.rating}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800 font-semibold transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="text-red-600 hover:text-red-800 font-semibold transition"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal.type === 'add' || modal.type === 'edit' ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {modal.type === 'add' ? '➕ הוסף ספק חדש' : '✏️ עדכן ספק'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">שם</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="שם החברה"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">מייל</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@suppliers.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">טלפון</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-1234567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">סטטוס</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SupplierStatus })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">⏳ בהמתנה</option>
                  <option value="active">✅ פעיל</option>
                  <option value="suspended">🚫 הקפוא</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setModal({ type: null })}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {modal.type === 'delete' && modal.supplier ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🗑️ מחק ספק?</h2>
            <p className="text-gray-600 mb-6">
              האם אתה בטוח שאתה רוצה למחוק את <strong>{modal.supplier.name}</strong>?
              פעולה זו לא ניתנת לביטול.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: null })}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
