'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Search, Check, EyeOff, Eye, Plus, X } from 'lucide-react'
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
  source: string
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
          {product.source === 'manual' && (
            <span className="me-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              ידני
            </span>
          )}
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

interface Category {
  id: string
  name_he: string
}

const EMPTY = {
  sku: '',
  name_he: '',
  name_en: '',
  description_he: '',
  price: '',
  stock: '0',
  category_id: '',
}

/**
 * Products added here are marked source = 'manual', so the sheet sync leaves
 * them alone. Without that it would retire them on its next run for not being
 * in the sheet, and a product you can add but not keep is worse than none.
 */
function NewProduct({
  categories,
  onCreated,
}: {
  categories: Category[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku,
          name_he: form.name_he,
          name_en: form.name_en,
          description_he: form.description_he,
          category_id: form.category_id,
          base_price_excl_vat: form.price,
          stock_qty: form.stock,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ההוספה נכשלה')
      setForm(EMPTY)
      setOpen(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההוספה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white"
      >
        <Plus size={16} />
        מוצר חדש
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="w-full rounded-xl border border-stone-300 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-stone-900">מוצר חדש</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          aria-label="בטל"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">
            שם המוצר <span className="text-red-600">*</span>
          </span>
          <input
            value={form.name_he}
            onChange={(e) => set('name_he', e.target.value)}
            required
            autoFocus
            placeholder="דבק PUR 270/7 שקוף"
            className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">שם באנגלית</span>
          <input
            value={form.name_en}
            onChange={(e) => set('name_en', e.target.value)}
            placeholder="PUR 270/7 Transparent"
            className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">מק״ט</span>
          <input
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            placeholder="PUR-270-7"
            className="tnum mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            מחיר ליחידה ללא מע״מ <span className="text-red-600">*</span>
          </span>
          <input
            inputMode="decimal"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            required
            placeholder="1250"
            className="tnum mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">מלאי</span>
          <input
            inputMode="numeric"
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            className="tnum mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">קטגוריה</span>
          <select
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-2"
          >
            <option value="">ללא קטגוריה</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_he}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">תיאור</span>
          <textarea
            value={form.description_he}
            onChange={(e) => set('description_he', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-stone-300 p-3"
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !form.name_he || !form.price}
          className="h-11 rounded-lg bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'מוסיף…' : 'הוסף מוצר'}
        </button>
        <span className="text-xs text-stone-500">
          את התמונה מעלים אחרי ההוספה, מהשורה של המוצר.
        </span>
      </div>
    </form>
  )
}

export default function ProductsClient({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
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
        <div className="flex flex-wrap items-center gap-3">
          <NewProduct categories={categories} onCreated={() => router.refresh()} />
          <SyncButton />
        </div>
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
