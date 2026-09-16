'use client'

import { useMemo, useState } from 'react'
import { FileSpreadsheet, Plus, Search, ImageOff, PackageOpen, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { unitLabel } from '@/lib/catalog'
import PriceImport from '@/components/import/PriceImport'
import ProductForm from './ProductForm'
import ProductPicker from './ProductPicker'
import type { CatalogPick, CategoryOption, ProductItem } from '../types'
import type { Notify } from '../SupplierApp'

function Thumb({ product }: { product: ProductItem }) {
  const [failed, setFailed] = useState(false)
  const usable = product.imageUrl && !product.imageUrl.includes('drive.google.com') && !failed

  if (!usable) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
        <ImageOff size={18} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl!}
      alt=""
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 bg-white object-cover"
    />
  )
}

function ProductRow({ product, onOpen }: { product: ProductItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 border-b border-stone-100 p-3 text-start last:border-b-0 hover:bg-stone-50 ${
        product.isActive ? '' : 'opacity-60'
      }`}
    >
      <Thumb product={product} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-stone-900">{product.name}</span>
        <span className="block truncate text-xs text-stone-500">
          {product.categoryName ?? 'ללא קטגוריה'}
          {product.packLabel && ` · ${product.packLabel}${product.packQty ? ` ${product.packQty}` : ''}`}
          {!product.isActive && ' · מוסתר'}
        </span>
      </span>
      <span className="shrink-0 text-end">
        <span className="tnum block font-bold text-stone-900">{formatIls(product.price)}</span>
        <span
          className={`block text-xs ${product.stock > 0 ? 'text-stone-500' : 'font-semibold text-red-700'}`}
        >
          {product.stock > 0 ? `ל${unitLabel(product.baseUnit)} · מלאי ${product.stock}` : 'אזל'}
        </span>
      </span>
    </button>
  )
}

/**
 * The supplier's own products: find one, tap it, change it.
 *
 * Adding is always one tap away — a button at the top on a wide screen, and a
 * floating one above the tab bar on a phone, where scrolling a long list would
 * otherwise put it out of reach.
 */
export default function ProductsTab({
  products,
  categories,
  catalog,
  notify,
}: {
  products: ProductItem[]
  categories: CategoryOption[]
  catalog: CatalogPick[]
  notify: Notify
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ProductItem | 'new' | null>(null)
  const [picking, setPicking] = useState(false)
  const [attachTo, setAttachTo] = useState<CatalogPick | null>(null)
  const [importing, setImporting] = useState(false)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product.name, product.nameEn, product.brand, product.mpn, product.sku, product.categoryName].some(
        (field) => field?.toLowerCase().includes(q)
      )
    )
  }, [products, query])

  const missingImages = products.filter((product) => !product.imageUrl).length
  const outOfStock = products.filter((product) => product.stock <= 0).length

  return (
    <div className="space-y-3">
      {products.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-8 text-center">
          <PackageOpen size={40} className="mx-auto text-stone-300" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">הקטלוג שלך ריק</h2>
          <p className="mt-1 text-sm text-stone-600">
            הוסף את המוצר הראשון — שם, מחיר ותמונה. נגרים יראו אותו מיד.
          </p>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-6 font-bold text-white"
          >
            <Plus size={18} />
            הוסף מוצר ראשון
          </button>
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-emerald-800 underline sm:inline-flex sm:w-auto sm:px-4"
          >
            <FileSpreadsheet size={16} />
            יש לכם מחירון באקסל? ייבוא בבת אחת
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
                style={{ insetInlineStart: '0.75rem' }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש מוצר, מותג או מק״ט"
                aria-label="חיפוש מוצרים"
                className="h-11 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3"
              />
            </div>
            <button
              type="button"
              onClick={() => setImporting(true)}
              aria-label="ייבוא מאקסל"
              title="ייבוא מאקסל"
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 font-semibold text-stone-700"
            >
              <FileSpreadsheet size={17} />
              <span className="hidden sm:inline">ייבוא מאקסל</span>
            </button>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white sm:flex"
            >
              <Plus size={17} />
              הוסף מוצר
            </button>
          </div>

          {(missingImages > 0 || outOfStock > 0) && (
            <p className="text-xs text-stone-500">
              {products.length} מוצרים
              {missingImages > 0 && ` · ${missingImages} בלי תמונה`}
              {outOfStock > 0 && ` · ${outOfStock} אזלו`}
            </p>
          )}

          {shown.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600">
              לא נמצא מוצר שמתאים לחיפוש.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              {shown.map((product) => (
                <ProductRow key={product.offerId} product={product} onOpen={() => setEditing(product)} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-label="הוסף מוצר"
            className="fixed bottom-20 end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg sm:hidden"
          >
            <Plus size={26} />
          </button>
        </>
      )}

      {importing && (
        <div role="dialog" aria-modal="true" aria-label="ייבוא מחירון" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="flex max-h-[96dvh] w-full flex-col rounded-t-2xl bg-stone-50 sm:max-w-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:rounded-t-2xl">
              <h2 className="font-bold text-stone-900">ייבוא מחירון מאקסל</h2>
              <button type="button" onClick={() => setImporting(false)} aria-label="סגור" className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
                <X size={20} />
              </button>
            </header>
            <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <PriceImport
                onClose={() => {
                  setImporting(false)
                  notify('המחירון עודכן')
                }}
              />
            </div>
          </div>
        </div>
      )}

      {picking && (
        <ProductPicker
          catalog={catalog}
          onPick={(item) => {
            setPicking(false)
            setAttachTo(item)
            setEditing('new')
          }}
          onCreate={() => {
            setPicking(false)
            setAttachTo(null)
            setEditing('new')
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {editing && (
        <ProductForm
          key={editing === 'new' ? `new-${attachTo?.productId ?? ''}` : editing.offerId}
          product={editing === 'new' ? null : editing}
          attachTo={editing === 'new' ? attachTo : null}
          categories={categories}
          onClose={() => {
            setEditing(null)
            setAttachTo(null)
          }}
          notify={notify}
        />
      )}
    </div>
  )
}
