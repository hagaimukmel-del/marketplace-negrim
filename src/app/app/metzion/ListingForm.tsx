'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Gift, ImagePlus, Tag, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { REGIONS, regionsForCity, type RegionKey } from '@/lib/regions'
import { downscaleImage } from '@/lib/image-downscale'
import {
  METZION_CATEGORIES,
  METZION_CONDITIONS,
  METZION_MAX_IMAGES,
  METZION_UNITS,
} from '@/lib/metzion'

export interface ListingFormValues {
  id?: string
  title: string
  description: string
  category: string
  condition: string
  dealType: 'sale' | 'free'
  quantity: string
  unit: string
  pricePerUnit: string
  contactName: string
  contactPhone: string
  city: string
  regions: string[]
  images: string[]
}

interface NewImage {
  key: string
  file: File
  preview: string
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly { key: T; label: string }[]
  value: string
  onChange: (key: T) => void
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={`h-10 rounded-full border px-3.5 text-sm font-semibold ${
            value === option.key ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const INPUT = 'mt-1 h-12 w-full rounded-[11px] border border-hair bg-white px-3'

/**
 * Post or edit a listing, in the order a carpenter thinks about it.
 *
 * Photos first — they are the listing. Then what it is, its condition, sale or
 * free, how many and for how much. The contact details and region are already
 * filled in from registration and only need a glance. Photos are shrunk on the
 * phone before they upload, so posting from the workshop does not wait on
 * megabytes.
 */
export default function ListingForm({ initial }: { initial: ListingFormValues }) {
  const router = useRouter()
  const editing = Boolean(initial.id)
  const fileInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(initial)
  const [kept, setKept] = useState<string[]>(initial.images)
  const [added, setAdded] = useState<NewImage[]>([])
  const [regionsTouched, setRegionsTouched] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // The region follows the city until the carpenter picks one themselves.
  const changeCity = (city: string) =>
    setForm((prev) => ({ ...prev, city, regions: regionsTouched ? prev.regions : regionsForCity(city) }))

  // Previews are released when the form goes away, not on every change — the
  // ones still on screen are in use.
  const addedRef = useRef(added)
  useEffect(() => {
    addedRef.current = added
  }, [added])
  useEffect(() => () => addedRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), [])

  const imageCount = kept.length + added.length
  const price = Number(form.pricePerUnit)
  const quantity = Number(form.quantity)
  const total = form.dealType === 'sale' && price > 0 && quantity > 0 ? price * quantity : null

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setPreparing(true)
    const room = METZION_MAX_IMAGES - imageCount
    const chosen = Array.from(files).slice(0, room)
    const prepared = await Promise.all(chosen.map((file) => downscaleImage(file)))
    setAdded((prev) => [
      ...prev,
      ...prepared.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
    setPreparing(false)
  }

  const toggleRegion = (key: RegionKey) => {
    setRegionsTouched(true)
    set('regions', form.regions.includes(key) ? form.regions.filter((item) => item !== key) : [...form.regions, key])
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (imageCount === 0) return setError('צריך לפחות תמונה אחת')
    if (form.regions.length === 0) return setError('צריך לבחור אזור')

    const data = new FormData()
    if (form.id) data.append('id', form.id)
    data.append('title', form.title)
    data.append('description', form.description)
    data.append('category', form.category)
    data.append('condition', form.condition)
    data.append('deal_type', form.dealType)
    data.append('quantity', form.quantity)
    data.append('unit', form.unit)
    if (form.dealType === 'sale') data.append('price_per_unit', form.pricePerUnit)
    data.append('contact_name', form.contactName)
    data.append('contact_phone', form.contactPhone)
    data.append('city', form.city)
    form.regions.forEach((region) => data.append('regions', region))
    kept.forEach((url) => data.append('keep_images', url))
    added.forEach((image) => data.append('images', image.file))

    setBusy(true)
    try {
      const response = await fetch('/api/metzion', { method: editing ? 'PATCH' : 'POST', body: data })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'השמירה נכשלה')
      router.push(`/app/metzion/mine?${editing ? 'saved' : 'created'}=1`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
      setBusy(false)
    }
  }

  const ready =
    form.title.trim().length >= 3 &&
    form.category &&
    form.condition &&
    Number(form.quantity) > 0 &&
    (form.dealType === 'free' || price > 0) &&
    form.contactName.trim() &&
    form.contactPhone.trim() &&
    form.city.trim() &&
    imageCount > 0

  return (
    <form onSubmit={submit} className="space-y-5 pb-28">
      <div>
        <h1 className="text-2xl font-extrabold text-ink md:text-[28px]">{editing ? 'עריכת מודעה' : 'מודעה חדשה במציאון'}</h1>
        <p className="mt-0.5 text-sm text-muted">המודעה פעילה 60 יום, ואפשר להאריך אותה.</p>
      </div>

      {/* Photos */}
      <section className="rounded-xl border border-hair bg-white p-4">
        <p className="font-semibold text-ink">
          תמונות <span className="text-red-600">*</span>
          <span className="tnum ms-2 text-xs font-normal text-muted">{imageCount}/{METZION_MAX_IMAGES}</span>
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {kept.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-[11px] bg-wood-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setKept(kept.filter((item) => item !== url))} aria-label="הסר תמונה" className="absolute top-1 end-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                <X size={14} />
              </button>
            </div>
          ))}
          {added.map((image) => (
            <div key={image.key} className="relative aspect-square overflow-hidden rounded-[11px] bg-wood-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(image.preview)
                  setAdded(added.filter((item) => item.key !== image.key))
                }}
                aria-label="הסר תמונה"
                className="absolute top-1 end-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {imageCount < METZION_MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={preparing}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[11px] border-2 border-dashed border-hair text-muted disabled:opacity-50"
            >
              {imageCount === 0 ? <Camera size={24} /> : <ImagePlus size={22} />}
              <span className="text-xs font-semibold">{preparing ? 'מכין…' : imageCount === 0 ? 'צלם / בחר' : 'עוד'}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          id="metzion-images"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </section>

      {/* What it is */}
      <section className="space-y-4 rounded-xl border border-hair bg-white p-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">מה מוכרים / מוסרים <span className="text-red-600">*</span></span>
          <input
            id="metzion-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={120}
            placeholder="6 לוחות MDF 17 מ״מ לבן"
            className={INPUT}
          />
        </label>

        <div>
          <span className="text-sm font-medium text-ink">קטגוריה <span className="text-red-600">*</span></span>
          <div className="mt-1.5">
            <Chips name="קטגוריה" options={METZION_CATEGORIES} value={form.category} onChange={(key) => set('category', key)} />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-ink">מצב הפריט <span className="text-red-600">*</span></span>
          <div className="mt-1.5">
            <Chips name="מצב הפריט" options={METZION_CONDITIONS} value={form.condition} onChange={(key) => set('condition', key)} />
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-ink">פרטים נוספים</span>
          <textarea
            id="metzion-description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="מידות, שנת ייצור, סיבת המכירה, איסוף בלבד…"
            className="mt-1 w-full rounded-[11px] border border-hair p-3"
          />
        </label>
      </section>

      {/* Deal */}
      <section className="space-y-4 rounded-xl border border-hair bg-white p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('dealType', 'sale')}
            aria-pressed={form.dealType === 'sale'}
            className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border font-bold ${
              form.dealType === 'sale' ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
            }`}
          >
            <Tag size={17} />
            למכירה
          </button>
          <button
            type="button"
            onClick={() => set('dealType', 'free')}
            aria-pressed={form.dealType === 'free'}
            className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border font-bold ${
              form.dealType === 'free' ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
            }`}
          >
            <Gift size={17} />
            למסירה בחינם
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">כמות <span className="text-red-600">*</span></span>
            <input id="metzion-quantity" inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={`tnum ${INPUT}`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">יחידה</span>
            <select id="metzion-unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} className={`${INPUT} px-2`}>
              {METZION_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
        </div>

        {form.dealType === 'sale' && (
          <label className="block">
            <span className="text-sm font-medium text-ink">מחיר ל{form.unit} (₪) <span className="text-red-600">*</span></span>
            <input id="metzion-price" inputMode="decimal" value={form.pricePerUnit} onChange={(e) => set('pricePerUnit', e.target.value)} placeholder="120" className={`tnum ${INPUT}`} />
            {total != null && quantity > 1 && (
              <span className="tnum mt-1 block text-xs text-muted">סה״כ לכל הכמות: {formatIls(total)}</span>
            )}
          </label>
        )}
      </section>

      {/* Contact */}
      <section className="space-y-3 rounded-xl border border-hair bg-white p-4">
        <p className="font-semibold text-ink">איך יוצרים איתך קשר</p>
        <p className="-mt-2 text-xs text-muted">הטלפון מוצג רק לנגריות רשומות, ורק אחרי לחיצה.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">שם <span className="text-red-600">*</span></span>
            <input id="metzion-contact-name" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">טלפון (גם לוואטסאפ) <span className="text-red-600">*</span></span>
            <input id="metzion-contact-phone" type="tel" inputMode="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={`tnum ${INPUT}`} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-ink">יישוב לאיסוף <span className="text-red-600">*</span></span>
            <input id="metzion-city" value={form.city} onChange={(e) => changeCity(e.target.value)} className={INPUT} />
          </label>
        </div>
        <div>
          <span className="text-sm font-medium text-ink">אזור <span className="text-red-600">*</span></span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {REGIONS.map((region) => {
              const on = form.regions.includes(region.key)
              return (
                <button
                  key={region.key}
                  type="button"
                  onClick={() => toggleRegion(region.key)}
                  aria-pressed={on}
                  className={`h-9 rounded-full border px-3 text-sm font-semibold ${
                    on ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
                  }`}
                >
                  {region.name}
                </button>
              )
            })}
          </div>
          {!regionsTouched && form.regions.length === 0 && form.city.trim() && (
            <p className="mt-1 text-xs text-amber-800">לא זיהינו את היישוב — בחר את האזור.</p>
          )}
        </div>
      </section>

      {error && <p role="alert" className="rounded-[11px] bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-hair bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:start-[236px] md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button type="submit" disabled={busy || preparing || !ready} className="h-12 flex-1 rounded-[11px] bg-brand font-bold text-navy disabled:opacity-50">
            {busy ? 'מפרסם…' : editing ? 'שמור שינויים' : 'פרסם מודעה'}
          </button>
          <button type="button" onClick={() => router.back()} disabled={busy} className="h-12 rounded-[11px] border border-hair px-5 font-semibold text-ink">
            ביטול
          </button>
        </div>
      </div>
    </form>
  )
}
