'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ExternalLink, FileText, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { callApi, type ProductItem, type SupplierDoc, type SupplierDocs } from './types'
import type { Notify } from './SupplierApp'

const DOC_TYPES = {
  spec_sheet: 'דף טכני',
  usage_guide: 'הנחיות שימוש',
  datasheet: 'דטאשיט',
  image: 'תמונה',
  other: 'אחר',
} as const

type DocType = keyof typeof DOC_TYPES

const INPUT = 'mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3'

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Jerusalem' })
}

function DocRow({
  doc,
  busy,
  onReplace,
  onDelete,
}: {
  doc: SupplierDoc
  busy: boolean
  onReplace?: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="flex items-center gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0">
      <FileText size={20} className="shrink-0 text-stone-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-stone-900">{doc.productName ?? doc.title}</p>
        <p className="truncate text-sm text-stone-500">
          {doc.productName ? `${doc.title} · ` : ''}
          {formatDate(doc.uploadedAt)}
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="h-9 rounded-lg bg-red-700 px-3 text-base font-semibold text-white disabled:opacity-50"
          >
            למחוק
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            aria-label="ביטול"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`פתח ${doc.title}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
          >
            <ExternalLink size={17} />
          </a>
          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              aria-label={`החלף ${doc.title}`}
              title="החלף"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`מחק ${doc.title}`}
            title="מחק"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * The supplier's documents: a catalogue for the whole business, and a sheet
 * per product.
 *
 * Carpenters see both on the product page. Everything uploaded is listed here
 * with open, replace and delete, so a supplier can keep sheets current without
 * asking anyone. Products still missing a sheet are one tap from the form.
 */
export default function UploadDocuments({
  products,
  documents,
  notify,
}: {
  products: ProductItem[]
  documents: SupplierDocs
  notify: Notify
}) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [productId, setProductId] = useState('')
  const [docType, setDocType] = useState<DocType>('spec_sheet')
  const [file, setFile] = useState<File | null>(null)
  const [replacing, setReplacing] = useState<SupplierDoc | null>(null)
  const [catalogFile, setCatalogFile] = useState<File | null>(null)
  const [catalogTitle, setCatalogTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [showMissing, setShowMissing] = useState(false)

  const missing = products.filter((product) => !product.hasSheet)

  const pick = (id: string, doc: SupplierDoc | null = null) => {
    setProductId(id)
    setReplacing(doc)
    form.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const uploadSheet = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!productId || !file) return
    setBusy(true)
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('product_id', productId)
      data.append('doc_type', docType)
      data.append('title_he', `${DOC_TYPES[docType]}: ${file.name}`)
      if (replacing) data.append('replaces', replacing.id)
      await callApi('/api/supplier/documents/upload', { method: 'POST', body: data })
      notify(replacing ? 'הדף הוחלף' : 'הדף הועלה')
      setFile(null)
      setProductId('')
      setReplacing(null)
      form.current?.reset()
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ההעלאה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  const uploadCatalog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!catalogFile) return
    const target = event.currentTarget
    setBusy(true)
    try {
      const data = new FormData()
      data.append('file', catalogFile)
      data.append('title', catalogTitle)
      await callApi('/api/supplier/documents/catalog', { method: 'POST', body: data })
      notify('הקטלוג הועלה')
      setCatalogFile(null)
      setCatalogTitle('')
      target.reset()
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ההעלאה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (doc: SupplierDoc, kind: 'sheet' | 'catalog') => {
    setBusy(true)
    try {
      await callApi(`/api/supplier/documents/${doc.id}?kind=${kind}`, { method: 'DELETE' })
      notify('נמחק')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'המחיקה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-4">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <BookOpen size={18} className="text-emerald-700" />
            קטלוג כללי לעסק
          </h2>
          <p className="mt-0.5 text-base text-stone-600">PDF אחד או כמה. נגרים רואים אותו בדף של כל מוצר שאתם מוכרים.</p>
        </div>
        {documents.catalogs.length > 0 && (
          <ul className="border-t border-stone-100">
            {documents.catalogs.map((doc) => (
              <DocRow key={doc.id} doc={doc} busy={busy} onDelete={() => remove(doc, 'catalog')} />
            ))}
          </ul>
        )}
        <form onSubmit={uploadCatalog} className="grid gap-3 border-t border-stone-100 bg-stone-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-base font-medium text-stone-700">שם (לא חובה)</span>
            <input
              value={catalogTitle}
              onChange={(e) => setCatalogTitle(e.target.value)}
              placeholder="קטלוג 2026"
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-base font-medium text-stone-700">קובץ PDF, עד 20MB</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCatalogFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-base file:me-3 file:h-12 file:rounded-lg file:border-0 file:bg-white file:px-4 file:font-semibold file:text-stone-700"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !catalogFile}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500"
          >
            <Upload size={17} />
            העלה קטלוג
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-4">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <FileText size={18} className="text-emerald-700" />
            דפים טכניים למוצרים
          </h2>
          {products.length > 0 && (
            <p className="mt-0.5 text-base text-stone-600">
              {missing.length === 0
                ? 'לכל המוצרים שלך יש דף.'
                : `חסר דף ב־${missing.length} מתוך ${products.length} מוצרים.`}
              {missing.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMissing((open) => !open)}
                  className="ms-2 font-semibold text-emerald-800 underline"
                >
                  {showMissing ? 'הסתר' : 'הצג אותם'}
                </button>
              )}
            </p>
          )}
        </div>

        {showMissing && missing.length > 0 && (
          <ul className="max-h-72 overflow-y-auto border-t border-stone-100">
            {missing.map((product) => (
              <li key={product.offerId} className="flex items-center gap-3 border-b border-stone-100 px-4 py-2 last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-base text-stone-800">{product.name}</span>
                <button
                  type="button"
                  onClick={() => pick(product.productId)}
                  className="h-9 shrink-0 rounded-lg border border-stone-300 px-3 text-base font-semibold text-stone-700"
                >
                  העלה דף
                </button>
              </li>
            ))}
          </ul>
        )}

        <form ref={form} onSubmit={uploadSheet} className="grid gap-3 border-t border-stone-100 bg-stone-50 p-4 sm:grid-cols-2">
          {replacing && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-base text-amber-900 sm:col-span-2">
              <RefreshCw size={16} className="shrink-0" />
              <span className="min-w-0 flex-1">מחליף את: {replacing.title}</span>
              <button
                type="button"
                onClick={() => {
                  setReplacing(null)
                  setProductId('')
                }}
                aria-label="ביטול החלפה"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-100"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <label className="block sm:col-span-2">
            <span className="text-base font-medium text-stone-700">מוצר</span>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setReplacing(null)
              }}
              disabled={busy || Boolean(replacing)}
              className={INPUT}
            >
              <option value="">בחר מוצר</option>
              {[...missing, ...products.filter((product) => product.hasSheet)].map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name}
                  {product.hasSheet ? ' (יש דף)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-base font-medium text-stone-700">סוג</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              disabled={busy}
              className={INPUT}
            >
              {Object.entries(DOC_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-base font-medium text-stone-700">קובץ: PDF, JPG או PNG עד 10MB</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="mt-1 block w-full text-base file:me-3 file:h-12 file:rounded-lg file:border-0 file:bg-white file:px-4 file:font-semibold file:text-stone-700"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !productId || !file}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:col-span-2 sm:w-fit sm:px-8"
          >
            <Upload size={17} />
            {busy ? 'מעלה…' : replacing ? 'החלף' : 'העלה'}
          </button>
        </form>

        {documents.sheets.length > 0 && (
          <>
            <h3 className="border-t border-stone-100 px-4 pt-4 text-base font-bold text-stone-700">
              מה הועלה ({documents.sheets.length})
            </h3>
            <ul className="mt-1">
              {documents.sheets.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  busy={busy}
                  onReplace={doc.productId ? () => pick(doc.productId!, doc) : undefined}
                  onDelete={() => remove(doc, 'sheet')}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
