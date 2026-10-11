'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Search, Undo2 } from 'lucide-react'
import { unitLabel } from '@/lib/catalog'
import { callApi, jsonInit, type ProductItem } from '../types'
import type { Notify } from '../SupplierApp'

interface Draft {
  price: string
  stock: string
  active: boolean
}

function draftOf(product: ProductItem): Draft {
  return { price: String(product.price), stock: String(product.stock), active: product.isActive }
}

/** What changed in one row, as the bulk route takes it, or null when nothing did. */
function changeOf(product: ProductItem, draft: Draft) {
  const change: { offer_id: string; price_excl_vat?: number; stock_qty?: number; is_active?: boolean } = {
    offer_id: product.offerId,
  }
  const price = Number(draft.price)
  if (draft.price.trim() !== '' && price !== product.price) change.price_excl_vat = price
  const stock = Number(draft.stock)
  if (draft.stock.trim() !== '' && stock !== product.stock) change.stock_qty = stock
  if (draft.active !== product.isActive) change.is_active = draft.active
  return Object.keys(change).length > 1 ? change : null
}

function invalid(draft: Draft): boolean {
  const price = Number(draft.price)
  const stock = Number(draft.stock)
  return !(Number.isFinite(price) && price > 0) || !(Number.isInteger(stock) && stock >= 0)
}

/**
 * Every price on one screen, typed like a spreadsheet: change what moved, then
 * one save. Rows that changed are tinted, a bad number is outlined in red and
 * blocks the save, and "בטל" puts the table back the way it loaded.
 *
 * On a phone each product is a short card with the same three fields, and the
 * save bar sits above the tab bar.
 */
export default function QuickEdit({ products, notify }: { products: ProductItem[]; notify: Notify }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(products.map((product) => [product.offerId, draftOf(product)]))
  )
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (offerId: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [offerId]: { ...prev[offerId], ...patch } }))

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product.name, product.sku, product.brand, product.categoryName].some((field) => field?.toLowerCase().includes(q))
    )
  }, [products, query])

  const changes = products
    .map((product) => (drafts[product.offerId] ? changeOf(product, drafts[product.offerId]) : null))
    .filter((change) => change !== null)
  const errors = products.filter((product) => drafts[product.offerId] && invalid(drafts[product.offerId])).length

  const save = async () => {
    setBusy(true)
    try {
      const result = await callApi<{ saved: number; failed: string[] }>(
        '/api/supplier/offers',
        jsonInit('POST', { changes })
      )
      notify(result.failed.length ? `נשמרו ${result.saved}, ${result.failed.length} לא נשמרו` : `נשמרו ${result.saved} שינויים`, result.failed.length ? 'error' : 'ok')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'השמירה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => setDrafts(Object.fromEntries(products.map((product) => [product.offerId, draftOf(product)])))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
          style={{ insetInlineStart: '0.75rem' }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="סנן לפי שם, מק״ט או קטגוריה"
          aria-label="סינון"
          className="h-11 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="sticky top-0 z-10 hidden grid-cols-[1fr_9rem_7rem_5rem] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 sm:grid">
          <span>מוצר</span>
          <span>מחיר ללא מע״מ (₪)</span>
          <span>מלאי</span>
          <span className="text-center">מוצג</span>
        </div>
        {shown.map((product) => {
          const draft = drafts[product.offerId]
          if (!draft) return null
          const changed = changeOf(product, draft) !== null
          const priceBad = !(Number(draft.price) > 0)
          const stockBad = !(Number.isInteger(Number(draft.stock)) && Number(draft.stock) >= 0)
          return (
            <div
              key={product.offerId}
              className={`grid grid-cols-[1fr_1fr_auto] items-center gap-x-3 gap-y-2 border-b border-stone-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_9rem_7rem_5rem] ${
                changed ? 'bg-amber-50' : ''
              }`}
            >
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <p className={`truncate font-semibold ${draft.active ? 'text-stone-900' : 'text-stone-400'}`}>{product.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {product.sku ? `מק״ט ${product.sku} · ` : ''}ל{unitLabel(product.baseUnit)}
                  {product.packLabel ? ` · ${product.packLabel}${product.packQty ? ` ${product.packQty}` : ''}` : ''}
                </p>
              </div>
              <label className="block">
                <span className="text-xs text-stone-500 sm:sr-only">מחיר ₪</span>
                <input
                  value={draft.price}
                  onChange={(e) => set(product.offerId, { price: e.target.value })}
                  inputMode="decimal"
                  dir="ltr"
                  aria-label={`מחיר ${product.name}`}
                  className={`tnum h-11 w-full rounded-lg border bg-white px-2 text-end ${
                    priceBad ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-300'
                  }`}
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-500 sm:sr-only">מלאי</span>
                <input
                  value={draft.stock}
                  onChange={(e) => set(product.offerId, { stock: e.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  aria-label={`מלאי ${product.name}`}
                  className={`tnum h-11 w-full rounded-lg border bg-white px-2 text-end ${
                    stockBad ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-300'
                  }`}
                />
              </label>
              <label className="flex flex-col items-center justify-center self-end sm:self-center">
                <span className="text-xs text-stone-500 sm:sr-only">מוצג</span>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => set(product.offerId, { active: e.target.checked })}
                  aria-label={`מוצג לנגרים: ${product.name}`}
                  className="h-11 w-6 accent-emerald-700"
                />
              </label>
            </div>
          )
        })}
        {shown.length === 0 && <p className="p-6 text-center text-sm text-stone-600">לא נמצא מוצר שמתאים לסינון.</p>}
      </div>

      {(changes.length > 0 || errors > 0) && (
        <div className="sticky bottom-20 z-30 flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2 shadow-lg sm:bottom-4">
          <p className="flex-1 px-2 text-sm font-semibold text-stone-800">
            {errors > 0 ? `${errors} שדות לא תקינים` : `${changes.length} מוצרים השתנו`}
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="flex h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
          >
            <Undo2 size={16} />
            בטל
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || errors > 0 || changes.length === 0}
            className="flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500"
          >
            <Check size={17} />
            {busy ? 'שומר…' : 'שמור'}
          </button>
        </div>
      )}
    </div>
  )
}
