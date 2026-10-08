'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductItem } from './types'

interface Document {
  id: string
  title_he: string
  doc_type: string
}

interface UploadDocumentsProps {
  products: ProductItem[]
}

export default function UploadDocuments({ products }: UploadDocumentsProps) {
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [docType, setDocType] = useState<string>('spec_sheet')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !file) {
      setMessage({ text: 'בחר מוצר וקובץ', type: 'error' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('product_id', selectedProduct)
      formData.append('doc_type', docType)
      formData.append('title_he', `${docType === 'spec_sheet' ? 'דף טכני' : docType}: ${file.name}`)

      const res = await fetch('/api/supplier/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'ההעלאה נכשלה')
      }

      const data = await res.json()
      setMessage({
        text: `העלאה הצליחה: ${data.document.title_he}`,
        type: 'success',
      })
      setFile(null)
      setSelectedProduct('')
      router.refresh()
    } catch (err) {
      setMessage({
        text: `שגיאה: ${err instanceof Error ? err.message : 'נסה שוב'}`,
        type: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  const missing = products.filter((product) => !product.hasSheet)

  const docTypeLabels = {
    spec_sheet: 'דף טכני',
    usage_guide: 'הנחיות שימוש',
    image: 'תמונה',
    datasheet: 'דטאשיט',
    other: 'אחר',
  } as const

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
      <h3 className="font-semibold text-lg">העלאת דפים טכניים</h3>
      {products.length > 0 && (
        <p className="text-sm text-slate-600">
          לכל מוצר יש מקום לדף טכני, והנגר רואה אותו בדף המוצר.{' '}
          {missing.length === 0
            ? 'לכל המוצרים שלך כבר יש דף.'
            : `חסר דף ב־${missing.length} מתוך ${products.length} מוצרים.`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">מוצר</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={uploading}
          >
            <option value="">-- בחר מוצר --</option>
            {[...missing, ...products.filter((product) => product.hasSheet)].map((product) => (
              <option key={product.productId} value={product.productId}>
                {product.name}
                {product.hasSheet ? ' (יש דף)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">סוג מסמך</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={uploading}
          >
            {Object.entries(docTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">קובץ</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.png,.jpeg"
            disabled={uploading}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG עד 10MB</p>
        </div>

        <button
          type="submit"
          disabled={uploading || !selectedProduct || !file}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
        >
          {uploading ? 'העלאה...' : 'העלה'}
        </button>
      </form>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
