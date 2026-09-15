'use client'

import { useMemo, useState } from 'react'
import { ImageOff, Plus, Search, X } from 'lucide-react'
import type { CatalogPick } from '../types'

function Thumb({ item }: { item: CatalogPick }) {
  const [failed, setFailed] = useState(false)
  if (!item.imageUrl || item.imageUrl.includes('drive.google.com') || failed) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
        <ImageOff size={16} />
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt=""
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-lg border border-stone-200 object-cover"
    />
  )
}

/**
 * The first step of adding a product: is it already on the site?
 *
 * Most of what a supplier sells, another supplier already listed — the same
 * glue, the same hinge. Picking it here attaches their price to that product,
 * so a carpenter sees one product with two prices instead of two copies that
 * look like different things. Typing a new product is the fallback, one tap
 * away at the bottom, not the default.
 */
export default function ProductPicker({
  catalog,
  onPick,
  onCreate,
  onClose,
}: {
  catalog: CatalogPick[]
  onPick: (item: CatalogPick) => void
  onCreate: () => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? catalog.filter((item) =>
          [item.name, item.nameEn, item.brand, item.mpn, item.categoryName].some((field) =>
            field?.toLowerCase().includes(q)
          )
        )
      : catalog
    return list.slice(0, 60)
  }, [catalog, query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="הוספת מוצר"
    >
      <div className="flex h-[94dvh] w-full flex-col rounded-t-2xl bg-white sm:h-[80dvh] sm:max-w-xl sm:rounded-2xl">
        <header className="border-b border-stone-200 px-4 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-stone-900">הוספת מוצר</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-stone-600">
            המוצר כבר קיים באתר? בחרו אותו והוסיפו רק את המחיר שלכם.
          </p>
          <div className="relative mt-3">
            <Search
              size={17}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
              style={{ insetInlineStart: '0.75rem' }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="חפשו לפי שם, מותג או מק״ט יצרן"
              aria-label="חיפוש בקטלוג"
              className="h-12 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {catalog.length === 0 ? (
            <p className="p-8 text-center text-sm text-stone-600">
              כל המוצרים שבאתר כבר נמצאים ברשימה שלכם.
            </p>
          ) : matches.length === 0 ? (
            <p className="p-8 text-center text-sm text-stone-600">
              לא מצאנו מוצר כזה באתר — אפשר ליצור אותו כמוצר חדש.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {matches.map((item) => (
                <li key={item.productId}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-stone-50"
                  >
                    <Thumb item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-900">{item.name}</span>
                      <span className="block truncate text-xs text-stone-500">
                        {[item.brand, item.categoryName].filter(Boolean).join(' · ') || 'ללא קטגוריה'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg border border-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
                      גם אני מוכר
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-stone-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCreate}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white"
          >
            <Plus size={18} />
            המוצר לא ברשימה — מוצר חדש
          </button>
        </footer>
      </div>
    </div>
  )
}
