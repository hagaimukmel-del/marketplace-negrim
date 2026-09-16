'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Lock, Minus, PackageX, Plus, Recycle, Search, ShieldCheck, ShoppingCart, X } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'
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
  /** The category the product is filed under, as written. */
  category: string | null
  topId: string | null
  /** Null when the product is filed on the main category itself. */
  subId: string | null
  price: number | null
}

export interface TopCategory {
  id: string
  name: string
  icon: string | null
  count: number
  children: { id: string; name: string; count: number }[]
}

/**
 * Product image with a designed fallback.
 *
 * Every image_url from the sheet is a Google Drive share link, which does not
 * render when hot-linked — the request hangs, then fails. Skip the request and
 * show the product's initials instead.
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

/**
 * A main category on the hub: its icon, its size, and the first few branches
 * that actually hold something — so the tile says what is inside before it is
 * opened. An empty one is still shown, quieter, because the structure is part of
 * what tells a supplier where their goods go and a carpenter what is coming.
 */
function HubTile({ top, onOpen }: { top: TopCategory; onOpen: () => void }) {
  const filled = top.children.filter((child) => child.count > 0)
  const preview = (filled.length > 0 ? filled : top.children).slice(0, 3).map((child) => child.name)
  const empty = top.count === 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full flex-col rounded-2xl border p-3.5 text-start transition-colors sm:p-4 ${
        empty
          ? 'border-stone-200 bg-stone-50'
          : 'border-stone-200 bg-white hover:border-emerald-600 hover:shadow-sm'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            empty ? 'bg-stone-200/70 text-stone-400' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          <CategoryIcon icon={top.icon} />
        </span>
        <span
          className={`tnum rounded-full px-2 py-0.5 text-xs font-semibold ${
            empty ? 'text-stone-400' : 'bg-stone-100 text-stone-600'
          }`}
        >
          {empty ? 'בקרוב' : top.count}
        </span>
      </span>
      <span className={`mt-3 font-bold leading-tight ${empty ? 'text-stone-500' : 'text-stone-900'}`}>
        {top.name}
      </span>
      {preview.length > 0 && (
        <span className="mt-1 line-clamp-2 text-xs leading-snug text-stone-500">
          {preview.join(' · ')}
          {top.children.length > preview.length && ' …'}
        </span>
      )}
    </button>
  )
}

export default function CatalogClient({
  items,
  tree,
  showPrices,
  adminView,
  initialTop,
  initialSub,
}: {
  items: CatalogItem[]
  tree: TopCategory[]
  showPrices: boolean
  adminView: boolean
  initialTop: string | null
  initialSub: string | null
}) {
  const cart = useCart()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [topId, setTopId] = useState<string | null>(initialTop)
  const [subId, setSubId] = useState<string | null>(initialSub)

  /**
   * Where you are lives in the address, pushed without a server round trip, so
   * the phone's back button goes up one level — from MDF to boards to the hub —
   * instead of leaving the catalogue.
   */
  const go = (nextTop: string | null, nextSub: string | null = null) => {
    setTopId(nextTop)
    setSubId(nextSub)
    setQuery('')
    const params = new URLSearchParams()
    if (nextTop) params.set('c', nextTop)
    if (nextSub) params.set('s', nextSub)
    const search = params.toString()
    window.history.pushState(null, '', search ? `?${search}` : window.location.pathname)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search)
      setTopId(params.get('c'))
      setSubId(params.get('s'))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const top = tree.find((node) => node.id === topId) ?? null
  const sub = top?.children.find((child) => child.id === subId) ?? null

  // A carpenter arrives knowing what he wants. Search is the primary way in and
  // looks across everything, wherever you are in the tree: typing something
  // that is filtered out should find it, not return nothing.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return items.filter((item) =>
      [item.name_he, item.name_en, item.description_he, item.brand, item.mpn, item.category, ...item.skus].some(
        (field) => field?.toLowerCase().includes(q)
      )
    )
  }, [items, query])

  const inTop = useMemo(
    () => (top ? items.filter((item) => item.topId === top.id) : []),
    [items, top]
  )

  /** Inside a main category with no branch chosen, the list is split by branch. */
  const sections = useMemo(() => {
    if (!top) return []
    if (sub) return [{ id: sub.id, name: null as string | null, items: inTop.filter((item) => item.subId === sub.id) }]
    const general = inTop.filter((item) => !item.subId)
    return [
      ...top.children
        .map((child) => ({ id: child.id, name: child.name as string | null, items: inTop.filter((item) => item.subId === child.id) }))
        .filter((section) => section.items.length > 0),
      ...(general.length > 0 ? [{ id: 'general', name: top.children.length > 0 ? 'כללי' : null, items: general }] : []),
    ]
  }, [top, sub, inTop])

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

  const list = (rows: CatalogItem[]) => (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      {rows.map((item) => (
        <ProductRowItem
          key={item.id}
          item={item}
          qty={quantities[item.id] ?? 1}
          onChange={setQty}
          onAdd={add}
        />
      ))}
    </div>
  )

  const filledChildren = top?.children.filter((child) => child.count > 0) ?? []
  const emptyChildren = top?.children.filter((child) => child.count === 0) ?? []
  const generalCount = inTop.filter((item) => !item.subId).length

  return (
    <div className="pb-4">
      {adminView && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
          <ShieldCheck size={15} className="shrink-0" />
          מצב אדמין — המחירים גלויים לך כי אתה מחובר כמנהל. מבקר לא רשום רואה מנעול.
        </p>
      )}

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

      {/* Breadcrumb: always one tap back up the tree. */}
      <nav aria-label="מיקום בקטלוג" className="mb-2 flex min-h-8 flex-wrap items-center gap-1 text-sm">
        {top ? (
          <>
            <button type="button" onClick={() => go(null)} className="font-medium text-emerald-800 hover:underline">
              קטלוג
            </button>
            <ChevronLeft size={14} className="text-stone-400" />
            {sub ? (
              <>
                <button type="button" onClick={() => go(top.id)} className="font-medium text-emerald-800 hover:underline">
                  {top.name}
                </button>
                <ChevronLeft size={14} className="text-stone-400" />
                <span className="font-semibold text-stone-900">{sub.name}</span>
              </>
            ) : (
              <span className="font-semibold text-stone-900">{top.name}</span>
            )}
          </>
        ) : (
          <h1 className="text-xl font-bold text-stone-900">קטלוג</h1>
        )}
        <span className="tnum ms-auto text-xs text-stone-500">{items.length} מוצרים באתר</span>
      </nav>

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
          className="h-12 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-10 text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="נקה חיפוש"
            className="absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
            style={{ insetInlineEnd: '0.25rem' }}
          >
            <X size={17} />
          </button>
        )}
      </div>

      {results ? (
        results.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
            <p className="font-semibold text-stone-900">לא נמצא מוצר בשם הזה</p>
            <p className="mt-1 text-sm text-stone-600">
              אם אתה צריך משהו שאינו בקטלוג — כתוב לנו ונשיג אותו.
            </p>
          </div>
        ) : (
          <section>
            <h2 className="tnum mb-2 text-sm font-bold text-stone-900">{results.length} תוצאות</h2>
            {list(results)}
          </section>
        )
      ) : !top ? (
        // The hub: every main category at once, so the whole shape of the
        // catalogue is visible before the first tap.
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {tree.map((node) => (
              <HubTile key={node.id} top={node} onOpen={() => go(node.id)} />
            ))}
          </div>
          {/* The board of carpenters for carpenters, one tap from the catalogue. */}
          <Link
            href="/carpenter/metzion"
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-600"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Recycle size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-emerald-950">מציאון</span>
              <span className="block text-sm text-emerald-900">עודפי חומר, פרזול ומכונות — מנגרים לנגרים, למכירה או בחינם</span>
            </span>
            <ChevronLeft size={18} className="shrink-0 text-emerald-700" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <CategoryIcon icon={top.icon} size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-stone-900">{sub?.name ?? top.name}</h1>
              <p className="tnum text-sm text-stone-500">
                {sub ? `${sub.count} מוצרים ב${top.name}` : top.count > 0 ? `${top.count} מוצרים` : 'עוד אין מוצרים'}
              </p>
            </div>
          </div>

          {/* The branches. Sticky, because the point of them is to stop the scrolling. */}
          {(filledChildren.length > 0 || generalCount > 0) && (
            <div className="sticky top-14 z-30 -mx-4 overflow-x-auto bg-stone-50/95 px-4 py-2 backdrop-blur">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => go(top.id)}
                  aria-pressed={!sub}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                    !sub ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
                  }`}
                >
                  הכל
                  <span className={`tnum text-xs ${!sub ? 'text-stone-300' : 'text-stone-400'}`}>{top.count}</span>
                </button>
                {filledChildren.map((child) => {
                  const active = sub?.id === child.id
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => go(top.id, child.id)}
                      aria-pressed={active}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                        active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
                      }`}
                    >
                      {child.name}
                      <span className={`tnum text-xs ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                        {child.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {top.count === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <p className="font-semibold text-stone-900">הקטגוריה הזו מתמלאת בקרוב</p>
              <p className="mt-1 text-sm text-stone-600">
                ספקים מצטרפים כל הזמן. מוכרים {top.name}?{' '}
                <Link href="/supplier/join" className="font-semibold text-emerald-800 underline">
                  הצטרפו כספק
                </Link>
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.id}>
                {section.name && (
                  <h2 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-stone-900">
                    {section.name}
                    <span className="tnum text-xs font-normal text-stone-400">{section.items.length}</span>
                  </h2>
                )}
                {list(section.items)}
              </section>
            ))
          )}

          {!sub && emptyChildren.length > 0 && (
            <p className="text-xs leading-relaxed text-stone-500">
              <span className="font-semibold text-stone-600">בקרוב ב{top.name}: </span>
              {emptyChildren.map((child) => child.name).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
