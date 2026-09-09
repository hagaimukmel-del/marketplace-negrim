'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Search, Check, EyeOff, Eye } from 'lucide-react'
import SyncButton from '../SyncButton'

interface Product {
  id: string
  sku: string | null
  name_he: string
  name_en: string | null
  description_he: string | null
  base_price_excl_vat: number
  stock_qty: number | null
  is_active: boolean | null
  image_url: string | null
  categories: { name_he: string } | null
}

/** A Drive share link does not render off-origin, so it does not count. */
function hasUsableImage(url: string | null): boolean {
  return Boolean(url) && !url!.includes('drive.google.com')
}

function Thumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const initials = product.name_he.replace(/[^\p{L}\p{N}]/gu, ' ').trim().slice(0, 3)

  if (!hasUsableImage(product.image_url) || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-xs font-bold text-stone-500">
        {initials}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url!}
      alt=""
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg bg-stone-100 object-cover"
    />
  )
}

function Row({
  product,
  busy,
  onPatch,
  onUpload,
}: {
  product: Product
  busy: boolean
  onPatch: (id: string, body: Record<string, unknown>) => void
  onUpload: (id: string, file: File) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [sku, setSku] = useState(product.sku ?? '')
  const [price, setPrice] = useState(String(product.base_price_excl_vat))
  const [stock, setStock] = useState(String(product.stock_qty ?? 0))

  const dirty =
    sku !== (product.sku ?? '') ||
    price !== String(product.base_price_excl_vat) ||
    stock !== String(product.stock_qty ?? 0)

  return (
    <div
      className={`flex flex-wrap items-center gap-3 border-b border-stone-200 p-3 last:border-b-0 ${
        product.is_active ? '' : 'bg-stone-50 opacity-60'
      }`}
    >
      <Thumb product={product} />

      <div className="min-w-[12rem] flex-1">
        <p className="font-bold leading-tight text-stone-900">{product.name_he}</p>
        <p className="truncate text-sm text-stone-500">
          {product.name_en}
          {product.categories?.name_he && ` · ${product.categories.name_he}`}
        </p>
      </div>

      <label className="text-xs text-stone-500">
        מק״ט
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="—"
          aria-label={`מק״ט עבור ${product.name_he}`}
          className={`tnum mt-0.5 block h-10 w-28 rounded-lg border px-2 text-center text-sm ${
            sku ? 'border-stone-300' : 'border-amber-300 bg-amber-50'
          }`}
        />
      </label>

      <label className="text-xs text-stone-500">
        מחיר ללא מע״מ
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-label={`מחיר עבור ${product.name_he}`}
          className="tnum mt-0.5 block h-10 w-24 rounded-lg border border-stone-300 px-2 text-center text-sm"
        />
      </label>

      <label className="text-xs text-stone-500">
        מלאי
        <input
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          aria-label={`מלאי עבור ${product.name_he}`}
          className="tnum mt-0.5 block h-10 w-20 rounded-lg border border-stone-300 px-2 text-center text-sm"
        />
      </label>

      <div className="flex items-center gap-1.5">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(product.id, file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          aria-label={`העלה תמונה עבור ${product.name_he}`}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border disabled:opacity-40 ${
            hasUsableImage(product.image_url)
              ? 'border-stone-300 text-stone-600'
              : 'border-amber-400 bg-amber-50 text-amber-800'
          }`}
        >
          <ImagePlus size={17} />
        </button>

        <button
          type="button"
          onClick={() => onPatch(product.id, { is_active: !product.is_active })}
          disabled={busy}
          aria-label={product.is_active ? 'השבת מוצר' : 'הפעל מוצר'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-600 disabled:opacity-40"
        >
          {product.is_active ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>

        <button
          type="button"
          onClick={() =>
            onPatch(product.id, { sku, base_price_excl_vat: price, stock_qty: stock })
          }
          disabled={busy || !dirty}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:bg-stone-200 disabled:text-stone-400"
        >
          <Check size={15} />
          שמור
        </button>
      </div>
    </div>
  )
}

type Filter = 'all' | 'no-image' | 'no-sku'

function Chip({
  value,
  label,
  active,
  onPick,
}: {
  value: Filter
  label: string
  active: boolean
  onPick: (value: Filter) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      aria-pressed={active}
      className={`h-9 rounded-lg border px-3 text-sm font-medium ${
        active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'
      }`}
    >
      {label}
    </button>
  )
}

export default function ProductsClient({ products }: { products: Product[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const missingImage = products.filter((p) => !hasUsableImage(p.image_url)).length
  const missingSku = products.filter((p) => !p.sku).length

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filter === 'no-image' && hasUsableImage(p.image_url)) return false
      if (filter === 'no-sku' && p.sku) return false
      if (!q) return true
      return [p.name_he, p.name_en, p.sku].some((f) => f?.toLowerCase().includes(q))
    })
  }, [products, query, filter])

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השמירה נכשלה')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  const upload = async (id: string, file: File) => {
    setBusy(id)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('id', id)
      form.append('file', file)
      const response = await fetch('/api/admin/products', { method: 'PATCH', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ההעלאה נכשלה')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ההעלאה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">מוצרים</h1>
        <SyncButton />
      </div>

      {/* The two counts that decide what to do next: a grey tile on the
          catalogue and a product an import cannot match. */}
      <div className="flex flex-wrap gap-2">
        <Chip value="all" label={`הכל (${products.length})`} active={filter === 'all'} onPick={setFilter} />
        <Chip value="no-image" label={`בלי תמונה (${missingImage})`} active={filter === 'no-image'} onPick={setFilter} />
        <Chip value="no-sku" label={`בלי מק״ט (${missingSku})`} active={filter === 'no-sku'} onPick={setFilter} />
      </div>

      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400"
          style={{ insetInlineStart: '0.75rem' }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש שם או מק״ט"
          aria-label="חיפוש מוצרים"
          className="h-11 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3"
        />
      </div>

      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">
          אין מוצרים שמתאימים לסינון.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {shown.map((product) => (
            <Row
              key={product.id}
              product={product}
              busy={busy === product.id}
              onPatch={patch}
              onUpload={upload}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-stone-500">
        המחירים והשמות מגיעים מהגיליון בכל סנכרון. עריכה כאן נשמרת מיד, אבל סנכרון הבא ידרוס
        אותה — לשינוי קבוע ערוך בגיליון.
      </p>
    </div>
  )
}
