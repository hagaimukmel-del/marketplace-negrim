'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, Minus, Plus, PackageX, Lock, Check } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIls, withVat } from '@/lib/vat'
import { unitLabel } from '@/lib/catalog'

/**
 * One row as the server chose to describe it.
 *
 * `price` is null for a visitor who has not registered — and null because the
 * server never sent one, not because this component agreed to look away.
 */
export interface CatalogItem {
  id: string
  name_he: string
  name_en: string | null
  description_he: string | null
  image_url: string | null
  base_unit: string
  brand: string | null
  mpn: string | null
  skus: string[]
  inStock: boolean
  supplierCount: number
  packLabel: string | null
  category: string
  /** The top-level group. Chips filter on this; headings show the category. */
  group: string
  price: number | null
}

/**
 * Product image with a designed fallback.
 *
 * Every image_url from the sheet is a Google Drive share link, which does not
 * render when hot-linked — the request hangs, then fails. Rendering the <img>
 * anyway left a 350px empty grey box on every row. Skip the request and show
 * the product's initials instead.
 */
function Thumb({ item }: { item: CatalogItem }) {
  const [failed, setFailed] = useState(false)
  const unusable = item.image_url?.includes('drive.google.com') ?? false
  const initials = item.name_he.replace(/[^\p{L}\p{N}]/gu, ' ').trim().slice(0, 3)

  if (!item.image_url || unusable || failed) {
    return (
      <div
        aria-hidden
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-sm font-bold text-stone-500"
      >
        {initials}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.image_url}
      alt=""
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-lg object-cover"
    />
  )
}

function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
      <Check size={13} /> במלאי
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-semibold text-stone-500">
      <PackageX size={13} /> אזל
    </span>
  )
}

function ProductRowItem({
  item,
  qty,
  onChange,
  onAdd,
}: {
  item: CatalogItem
  qty: number
  onChange: (id: string, qty: number) => void
  onAdd: (item: CatalogItem) => void
}) {
  const locked = item.price === null

  // On a phone the controls cannot share a row with the text: at 375px it
  // squeezed the product name into three lines. Stack below 640px.
  return (
    <div className="border-b border-stone-200 p-3 last:border-b-0 sm:flex sm:items-center sm:gap-3">
      <div className="flex gap-3 sm:min-w-0 sm:flex-1">
        <Thumb item={item} />

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-stone-900">{item.name_he}</p>
          {item.name_en && <p className="truncate text-sm text-stone-500">{item.name_en}</p>}
          {item.description_he && (
            <p className="mt-0.5 line-clamp-1 text-sm text-stone-600">{item.description_he}</p>
          )}
          {item.packLabel && <p className="mt-0.5 text-xs text-stone-500">נמכר ב{item.packLabel}</p>}

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {locked ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1 text-sm font-semibold text-stone-600">
                <Lock size={13} />
                מחיר לנגרים רשומים
              </span>
            ) : (
              <>
                {/* A carpenter quotes and buys excluding VAT, so that is the
                    number that gets the size. */}
                <span className="tnum text-lg font-bold text-stone-900">
                  {formatIls(item.price!)}
                </span>
                <span className="whitespace-nowrap text-xs text-stone-500">
                  ל{unitLabel(item.base_unit)} ללא מע״מ
                </span>
                <span className="tnum whitespace-nowrap text-xs text-stone-400">
                  {formatIls(withVat(item.price!))} כולל
                </span>
              </>
            )}

            <StockBadge inStock={item.inStock} />

            {/* Only worth saying once there is someone to compare against. */}
            {item.supplierCount > 1 && (
              <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {item.supplierCount} ספקים
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
        {locked ? (
          <Link
            href="/join"
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 sm:flex-none"
          >
            הירשם למחיר
          </Link>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(item.id, qty - 1)}
                disabled={qty <= 1}
                aria-label={`הפחת כמות עבור ${item.name_he}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700 disabled:opacity-30"
              >
                <Minus size={16} />
              </button>
              <input
                inputMode="numeric"
                value={qty}
                onChange={(e) => onChange(item.id, parseInt(e.target.value, 10) || 1)}
                aria-label={`כמות עבור ${item.name_he}`}
                className="h-10 w-14 rounded-lg border border-stone-300 text-center font-semibold"
              />
              <button
                type="button"
                onClick={() => onChange(item.id, qty + 1)}
                aria-label={`הוסף כמות עבור ${item.name_he}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onAdd(item)}
              disabled={!item.inStock}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-500 sm:flex-none"
            >
              {item.inStock ? (
                <>
                  <ShoppingCart size={15} /> הוסף
                </>
              ) : (
                <>
                  <PackageX size={15} /> אזל
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const ALL = 'הכל'

export default function CatalogClient({
  items,
  showPrices,
}: {
  items: CatalogItem[]
  showPrices: boolean
}) {
  const cart = useCart()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)

  // Counted over everything, not over what is currently filtered — a chip that
  // changes its own number when you press it is disorienting.
  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) counts.set(item.group, (counts.get(item.group) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [items])

  // A carpenter arrives knowing what he wants. Search is the primary way in;
  // the categories are for the times he is browsing rather than looking.
  //
  // Search deliberately ignores the chosen category: typing something that is
  // filtered out should find it, not return nothing and leave you wondering.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      return items.filter((item) =>
        [item.name_he, item.name_en, item.description_he, item.brand, item.mpn, ...item.skus].some(
          (field) => field?.toLowerCase().includes(q)
        )
      )
    }
    if (category === ALL) return items
    return items.filter((item) => item.group === category)
  }, [items, query, category])

  /**
   * With no filter on, the list is broken up by category so it can be scanned
   * rather than scrolled. Inside one category, or while searching, the headings
   * would just be noise.
   */
  const sections = useMemo(() => {
    if (query.trim()) return [{ name: null, items: shown }]
    const byCategory = new Map<string, CatalogItem[]>()
    for (const item of shown) {
      const existing = byCategory.get(item.category)
      if (existing) existing.push(item)
      else byCategory.set(item.category, [item])
    }
    return [...byCategory.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, list]) => ({ name, items: list }))
  }, [shown, query])

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty) }))

  const add = (item: CatalogItem) => {
    if (item.price === null) return
    cart.addItem(
      {
        id: item.id,
        name_he: item.name_he,
        name_en: item.name_en ?? item.name_he,
        base_price_excl_vat: item.price,
      },
      quantities[item.id] ?? 1
    )
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }))
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-900">קטלוג</h1>
        <p className="text-sm text-stone-500">
          {shown.length === items.length
            ? `${items.length} מוצרים`
            : `${shown.length} מתוך ${items.length}`}
        </p>
      </div>

      {!showPrices && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <Lock size={18} className="shrink-0 text-emerald-800" />
          <p className="min-w-0 flex-1 text-sm text-emerald-900">
            <strong className="block">המחירים שמורים לנגריות רשומות.</strong>
            ההרשמה לוקחת פחות מדקה, בלי סיסמה.
          </p>
          <Link
            href="/join"
            className="flex h-11 items-center rounded-lg bg-emerald-700 px-5 font-semibold text-white"
          >
            הרשמה
          </Link>
        </div>
      )}

      {/* Sticky, because the point of it is to stop the scrolling. */}
      <div className="sticky top-14 z-30 -mx-4 mb-3 overflow-x-auto bg-stone-50 px-4 py-2">
        <div className="flex gap-2">
          {[[ALL, items.length] as const, ...groups].map(([name, count]) => {
            const active = category === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCategory(name)
                  setQuery('')
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-300 bg-white text-stone-700'
                }`}
              >
                {name}
                <span className={`tnum text-xs ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative mb-4">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
          style={{ insetInlineStart: '0.75rem' }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש מוצר, מותג או מק״ט"
          aria-label="חיפוש בקטלוג"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3 text-base"
        />
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
          <p className="font-semibold text-stone-900">לא נמצא מוצר בשם הזה</p>
          <p className="mt-1 text-sm text-stone-600">
            אם אתה צריך משהו שאינו בקטלוג — כתוב לנו ונשיג אותו.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.name ?? 'all'}>
              {section.name && (
                <h2 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-stone-900">
                  {section.name}
                  <span className="tnum text-xs font-normal text-stone-400">
                    {section.items.length}
                  </span>
                </h2>
              )}
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                {section.items.map((item) => (
                  <ProductRowItem
                    key={item.id}
                    item={item}
                    qty={quantities[item.id] ?? 1}
                    onChange={setQty}
                    onAdd={add}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
