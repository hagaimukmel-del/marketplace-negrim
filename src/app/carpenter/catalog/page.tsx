'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ShoppingCart, Minus, Plus, PackageX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/lib/cart-context'
import { formatIls, withVat } from '@/lib/vat'
import {
  CATALOG_COLUMNS,
  bestOffer,
  byPrice,
  inStock,
  offerCount,
  packLabel,
  priceOf,
  unitLabel,
  type CatalogProduct,
} from '@/lib/catalog'

type Product = CatalogProduct

/**
 * Product image with a designed fallback.
 *
 * Every image_url in the catalogue is a Google Drive share link, which does not
 * render when hot-linked — the request hangs, then fails. The old page rendered
 * the <img> anyway, so each card carried a 350px empty grey box where a photo
 * should be. Skip the request and show the product's initials instead.
 */
function Thumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const unusable = product.image_url?.includes('drive.google.com') ?? false
  const initials = product.name_he.replace(/[^\p{L}\p{N}]/gu, ' ').trim().slice(0, 3)

  if (!product.image_url || unusable || failed) {
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
      src={product.image_url}
      alt=""
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 object-cover"
    />
  )
}

function ProductRowItem({
  product,
  qty,
  onChange,
  onAdd,
}: {
  product: Product
  qty: number
  onChange: (id: string, qty: number) => void
  onAdd: (product: Product) => void
}) {
  const offer = bestOffer(product)
  const price = priceOf(product)
  const outOfStock = !inStock(product)
  const pack = packLabel(offer, product.base_unit)
  const suppliers = offerCount(product)

  // On a phone the controls cannot share a row with the text: at 375px it
  // squeezed the product name into three lines and broke "ליח׳ ללא מע״מ"
  // across two. Stack below 640px, single row above it.
  return (
    <div className="border-b border-stone-200 p-3 last:border-b-0 sm:flex sm:items-center sm:gap-3">
      <div className="flex gap-3 sm:min-w-0 sm:flex-1">
        <Thumb product={product} />

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-stone-900">{product.name_he}</p>
          {product.name_en && (
            <p className="truncate text-sm text-stone-500">{product.name_en}</p>
          )}
          {product.description_he && (
            <p className="mt-0.5 line-clamp-1 text-sm text-stone-600">
              {product.description_he}
            </p>
          )}

          {/* What you actually take off the shelf, when the supplier said. */}
          {pack && (
            <p className="mt-0.5 text-xs text-stone-500">
              נמכר ב{pack}
            </p>
          )}

          {/* A carpenter quotes and buys excluding VAT, so that is the number
              that gets the size. The old page had this the other way round. */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="tnum text-lg font-bold text-stone-900">{formatIls(price)}</span>
            <span className="whitespace-nowrap text-xs text-stone-500">
              ל{unitLabel(product.base_unit)} ללא מע״מ
            </span>
            <span className="tnum whitespace-nowrap text-xs text-stone-400">
              {formatIls(withVat(price))} כולל
            </span>
            {/* Only worth saying once there is someone to compare against. */}
            {suppliers > 1 && (
              <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {suppliers} ספקים
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(product.id, qty - 1)}
            disabled={qty <= 1}
            aria-label={`הפחת כמות עבור ${product.name_he}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700 disabled:opacity-30"
          >
            <Minus size={16} />
          </button>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => onChange(product.id, parseInt(e.target.value, 10) || 1)}
            aria-label={`כמות עבור ${product.name_he}`}
            className="h-10 w-14 rounded-lg border border-stone-300 text-center font-semibold"
          />
          <button
            type="button"
            onClick={() => onChange(product.id, qty + 1)}
            aria-label={`הוסף כמות עבור ${product.name_he}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={outOfStock}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-500 sm:flex-none"
        >
          {outOfStock ? (
            <>
              <PackageX size={15} /> אזל
            </>
          ) : (
            <>
              <ShoppingCart size={15} /> הוסף
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const cart = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // A product is in the catalogue because someone sells it. The inner
        // join on live offers is what enforces that; PostgREST cannot sort on
        // an embedded column, so the ordering happens below.
        const { data, error: queryError } = await supabase
          .from('products')
          .select(CATALOG_COLUMNS)
          .eq('is_active', true)
          .eq('supplier_offers.is_active', true)

        if (queryError) throw queryError
        setProducts(((data ?? []) as unknown as Product[]).slice().sort(byPrice))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'טעינת הקטלוג נכשלה')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // A carpenter arrives knowing what he wants. Search is the primary way in;
  // the grid is the fallback, not the other way round.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    // Name first, because that is how a carpenter searches. Brand and part
    // number are here for the times he is holding the box.
    return products.filter((p) =>
      [
        p.name_he,
        p.name_en,
        p.description_he,
        p.brand,
        p.mpn,
        ...p.supplier_offers.map((offer) => offer.supplier_sku),
      ].some((field) => field?.toLowerCase().includes(q))
    )
  }, [products, query])

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty) }))

  const add = (product: Product) => {
    cart.addItem(
      {
        id: product.id,
        name_he: product.name_he,
        name_en: product.name_en ?? product.name_he,
        base_price_excl_vat: priceOf(product),
        supplier_id: bestOffer(product)?.supplier_id,
      },
      quantities[product.id] ?? 1
    )
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-stone-900">לא הצלחנו לטעון את הקטלוג.</p>
        <p className="mt-1 text-sm text-stone-500">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 h-11 rounded-lg bg-stone-900 px-5 font-semibold text-white"
        >
          נסה שוב
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-900">קטלוג</h1>
        <p className="text-sm text-stone-500">
          {shown.length === products.length
            ? `${products.length} מוצרים`
            : `${shown.length} מתוך ${products.length}`}
        </p>
      </div>

      <div className="relative mb-4">
        <Search
          size={18}
          className="pointer-events-none absolute inset-inline-start-3 top-1/2 -translate-y-1/2 text-stone-400"
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
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {shown.map((product) => (
            <ProductRowItem
              key={product.id}
              product={product}
              qty={quantities[product.id] ?? 1}
              onChange={setQty}
              onAdd={add}
            />
          ))}
        </div>
      )}
    </div>
  )
}
