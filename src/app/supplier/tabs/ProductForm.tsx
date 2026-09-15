'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Trash2, Eye, EyeOff, Info } from 'lucide-react'
import { formatIls, withVat } from '@/lib/vat'
import { BASE_UNITS, unitLabel } from '@/lib/catalog'
import { callApi, jsonInit, type CatalogPick, type CategoryOption, type ProductItem } from '../types'
import type { Notify } from '../SupplierApp'

/** The category tree as grouped options: each group selectable on its own. */
function CategoryOptions({ categories }: { categories: CategoryOption[] }) {
  const tops = categories.filter((category) => !category.parent_category_id)
  return (
    <>
      <option value="">בחר קטגוריה</option>
      {tops.map((top) => (
        <optgroup key={top.id} label={top.name_he}>
          <option value={top.id}>{top.name_he} — כללי</option>
          {categories
            .filter((category) => category.parent_category_id === top.id)
            .map((child) => (
              <option key={child.id} value={child.id}>
                {child.name_he}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  )
}

function Field({
  label,
  hint,
  required,
  children,
  wide,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-stone-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

const INPUT =
  'mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 disabled:bg-stone-100 disabled:text-stone-500'

/**
 * Add or edit one product, as a sheet over the list.
 *
 * On a phone it rises from the bottom and fills the screen, with save and cancel
 * pinned where the thumb is; on a wider screen it is a centred card. The photo
 * comes first because it is what a carpenter scrolling the catalogue sees first,
 * and on a phone the picker offers the camera directly.
 *
 * A product another supplier created is shared, so its name, category, unit and
 * photo are shown but locked; only this supplier's price, stock and pack can
 * change.
 */
export default function ProductForm({
  product,
  attachTo = null,
  categories,
  onClose,
  notify,
}: {
  product: ProductItem | null
  /** A catalogue product this supplier is adding their own price to. */
  attachTo?: CatalogPick | null
  categories: CategoryOption[]
  onClose: () => void
  notify: Notify
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const isNew = product === null
  const canEditProduct = product ? product.canEditProduct : !attachTo
  // What the product is: from the supplier's own row, or from the catalogue.
  const shared = product ?? attachTo

  const initial = {
    name_he: shared?.name ?? '',
    category_id: shared?.categoryId ?? '',
    brand: shared?.brand ?? '',
    mpn: shared?.mpn ?? '',
    base_unit: shared?.baseUnit ?? 'unit',
    description_he: shared?.description ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '',
    sku: product?.sku ?? '',
    pack_label: product?.packLabel ?? '',
    pack_qty: product?.packQty == null ? '' : String(product.packQty),
    min_order_qty: product ? String(product.minOrderQty) : '1',
  }

  const [form, setForm] = useState(initial)
  const [snapshot] = useState(() => JSON.stringify(initial))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof initial, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const dirty = file !== null || JSON.stringify(form) !== snapshot
  const price = Number(form.price)
  const imageShown =
    preview ?? (shared?.imageUrl && !shared.imageUrl.includes('drive.google.com') ? shared.imageUrl : null)

  const close = () => {
    if (dirty && !busy && !confirm('לצאת בלי לשמור את השינויים?')) return
    if (preview) URL.revokeObjectURL(preview)
    onClose()
  }

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  const uploadImage = async (offerId: string) => {
    if (!file) return
    const data = new FormData()
    data.append('offer_id', offerId)
    data.append('file', file)
    await callApi('/api/supplier/products', { method: 'PATCH', body: data })
  }

  const save = async () => {
    setError(null)
    if (!form.name_he.trim()) return setError('צריך שם מוצר')
    if (!Number.isFinite(price) || price <= 0) return setError('צריך מחיר גדול מאפס')

    setBusy(true)
    try {
      const offerFields = {
        price_excl_vat: form.price,
        stock_qty: form.stock === '' ? '0' : form.stock,
        supplier_sku: form.sku,
        pack_label: form.pack_label,
        pack_qty: form.pack_qty,
        min_order_qty: form.min_order_qty === '' ? '1' : form.min_order_qty,
      }
      const productFields = {
        name_he: form.name_he,
        category_id: form.category_id,
        brand: form.brand,
        mpn: form.mpn,
        base_unit: form.base_unit,
        description_he: form.description_he,
      }

      if (attachTo) {
        await callApi(
          '/api/supplier/products',
          jsonInit('POST', { product_id: attachTo.productId, ...offerFields })
        )
        notify('המוצר נוסף לרשימה שלך, עם המחיר שלך')
      } else if (isNew) {
        const created = await callApi<{ offer_id: string; merged: boolean }>(
          '/api/supplier/products',
          jsonInit('POST', { ...productFields, ...offerFields })
        )
        if (created.merged) {
          notify('המוצר כבר קיים בקטלוג — המחיר שלך נוסף אליו')
        } else {
          try {
            await uploadImage(created.offer_id)
            notify('המוצר נוסף')
          } catch (err) {
            notify(
              `המוצר נוסף, אבל התמונה לא הועלתה: ${err instanceof Error ? err.message : ''}`,
              'error'
            )
          }
        }
      } else {
        await callApi(
          '/api/supplier/products',
          jsonInit('PATCH', {
            offer_id: product.offerId,
            ...offerFields,
            ...(canEditProduct ? productFields : {}),
          })
        )
        if (canEditProduct) await uploadImage(product.offerId)
        notify('נשמר')
      }

      if (preview) URL.revokeObjectURL(preview)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async () => {
    if (!product) return
    setBusy(true)
    try {
      await callApi(
        '/api/supplier/products',
        jsonInit('PATCH', { offer_id: product.offerId, is_active: !product.isActive })
      )
      notify(product.isActive ? 'המוצר הוסתר מהקטלוג' : 'המוצר חזר לקטלוג')
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!product || !confirm('להסיר את המוצר מהקטלוג שלך? הפעולה אינה הפיכה.')) return
    setBusy(true)
    try {
      await callApi(`/api/supplier/products?offer_id=${product.offerId}`, { method: 'DELETE' })
      notify('המוצר הוסר')
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההסרה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'מוצר חדש' : 'עריכת מוצר'}
    >
      <div className="flex max-h-[94dvh] w-full flex-col rounded-t-2xl bg-white sm:max-w-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="font-bold text-stone-900">
            {attachTo ? 'הוספה מהקטלוג' : isNew ? 'מוצר חדש' : 'עריכת מוצר'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="סגור"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!canEditProduct && (
            <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
              <Info size={17} className="mt-0.5 shrink-0" />
              {attachTo
                ? 'המוצר כבר קיים באתר. מוסיפים אליו רק את המחיר, המלאי והאריזה שלך — השם, התמונה והקטגוריה משותפים לכל הספקים שמוכרים אותו.'
                : 'המוצר הזה משותף לספקים נוספים, ולכן השם, הקטגוריה והתמונה שלו נעולים. אתה שולט במחיר, במלאי ובאריזה שלך.'}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => canEditProduct && fileInput.current?.click()}
              disabled={!canEditProduct}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-400 disabled:cursor-default"
            >
              {imageShown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageShown} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera size={30} />
              )}
            </button>
            <div className="min-w-0 text-sm text-stone-600">
              <p className="font-semibold text-stone-900">תמונת מוצר</p>
              <p className="mt-0.5">
                {canEditProduct
                  ? 'צלם או בחר תמונה. מוצר עם תמונה נמכר יותר.'
                  : 'התמונה מנוהלת על ידי יוצר המוצר.'}
              </p>
              {canEditProduct && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-2 h-9 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700"
                >
                  {imageShown ? 'החלף תמונה' : 'בחר תמונה'}
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                pickFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם המוצר" required wide>
              <input
                value={form.name_he}
                onChange={(e) => set('name_he', e.target.value)}
                disabled={!canEditProduct}
                placeholder="דבק PUR שקוף 12 ק״ג"
                className={INPUT}
              />
            </Field>

            <Field label="קטגוריה" wide>
              <select
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                disabled={!canEditProduct}
                className={`${INPUT} px-2`}
              >
                <CategoryOptions categories={categories} />
              </select>
            </Field>

            <Field label="מחיר ללא מע״מ" required hint={Number.isFinite(price) && price > 0 ? `${formatIls(withVat(price))} כולל מע״מ` : undefined}>
              <input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="המחיר הוא ל־">
              <select
                value={form.base_unit}
                onChange={(e) => set('base_unit', e.target.value)}
                disabled={!canEditProduct}
                className={`${INPUT} px-2`}
              >
                {Object.entries(BASE_UNITS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="מלאי" hint="0 = אזל. נגר לא יוכל להזמין.">
              <input
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="0"
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="המק״ט שלך">
              <input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="לא חובה"
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="אריזה" hint="קרטון, דלי, שרוול…">
              <input
                value={form.pack_label}
                onChange={(e) => set('pack_label', e.target.value)}
                placeholder="קרטון"
                className={INPUT}
              />
            </Field>

            <Field label={`כמה ${unitLabel(form.base_unit)} באריזה`}>
              <input
                inputMode="decimal"
                value={form.pack_qty}
                onChange={(e) => set('pack_qty', e.target.value)}
                placeholder="25"
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="כמות מינימום להזמנה">
              <input
                inputMode="decimal"
                value={form.min_order_qty}
                onChange={(e) => set('min_order_qty', e.target.value)}
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="מותג / יצרן">
              <input
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                disabled={!canEditProduct}
                placeholder="Kleiberit"
                className={INPUT}
              />
            </Field>

            <Field
              label="מק״ט יצרן"
              hint="אם אותו מוצר כבר קיים אצל ספק אחר, המחיר שלך יתווסף אליו."
              wide
            >
              <input
                value={form.mpn}
                onChange={(e) => set('mpn', e.target.value)}
                disabled={!canEditProduct}
                placeholder="לא חובה"
                className={`tnum ${INPUT}`}
              />
            </Field>

            <Field label="תיאור" wide>
              <textarea
                value={form.description_he}
                onChange={(e) => set('description_he', e.target.value)}
                disabled={!canEditProduct}
                rows={3}
                placeholder="למה הוא משמש, זמן פתיחה, התאמה למכונות…"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3 disabled:bg-stone-100 disabled:text-stone-500"
              />
            </Field>
          </div>

          {!isNew && (
            <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={toggleActive}
                disabled={busy}
                className="flex h-11 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
              >
                {product.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                {product.isActive ? 'הסתר מהקטלוג' : 'החזר לקטלוג'}
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                הסר
              </button>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex gap-2 border-t border-stone-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="h-12 flex-1 rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-60"
          >
            {busy ? 'שומר…' : attachTo ? 'הוסף לרשימה שלי' : isNew ? 'הוסף מוצר' : 'שמור'}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="h-12 rounded-lg border border-stone-300 px-5 font-semibold text-stone-700"
          >
            ביטול
          </button>
        </footer>
      </div>
    </div>
  )
}
