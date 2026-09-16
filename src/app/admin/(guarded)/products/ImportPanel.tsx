'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import PriceImport from '@/components/import/PriceImport'

/**
 * The operator uploading a price list on a supplier's behalf — the same import
 * the supplier has, with the supplier chosen first. The import is recorded as
 * made by the admin, and the supplier can see and undo it in their own history.
 */
export default function ImportPanel({
  suppliers,
  onClose,
}: {
  suppliers: { id: string; company_name: string }[]
  onClose: () => void
}) {
  const [supplierId, setSupplierId] = useState(suppliers.length === 1 ? suppliers[0].id : '')

  return (
    <section className="w-full rounded-xl border border-stone-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-stone-900">ייבוא מחירון</h2>
        <button type="button" onClick={onClose} aria-label="סגור" className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
          <X size={17} />
        </button>
      </div>
      <label className="mt-3 block">
        <span className="text-sm font-medium text-stone-700">לאיזה ספק?</span>
        <select
          id="admin-import-supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-2"
        >
          <option value="">בחר ספק…</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.company_name}
            </option>
          ))}
        </select>
      </label>
      {supplierId && (
        <div className="mt-4">
          <PriceImport key={supplierId} supplierId={supplierId} onClose={onClose} />
        </div>
      )}
    </section>
  )
}
