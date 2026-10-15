'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X } from 'lucide-react'
import { REGIONS } from '@/lib/regions'
import { downscaleImage } from '@/lib/image-downscale'
import { DESCRIPTION_MAX, DESCRIPTION_MIN, JOB_MAX_DAYS, JOB_TYPES, isoDay, jobExpiry, shortDate } from '@/lib/work'

const INPUT = 'mt-1 h-12 w-full rounded-[11px] border border-hair bg-white px-3'

/**
 * Post a job, in the order a carpenter thinks about it: what kind of help,
 * where, by when, how much, then a few words. No title, no price and no
 * client: the type is the title, and the details stay between the two
 * carpentries once they talk.
 */
export default function JobForm({ region: initialRegion, today, last }: { region: string; today: string; last: string }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [jobType, setJobType] = useState('')
  const [region, setRegion] = useState(initialRegion)
  const [dueDate, setDueDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [material, setMaterial] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const small = await downscaleImage(file)
    if (image) URL.revokeObjectURL(image.preview)
    setImage({ file: small, preview: URL.createObjectURL(small) })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!jobType) return setError('צריך לבחור במה צריך עזרה')
    if (!region) return setError('צריך לבחור אזור')
    if (!dueDate) return setError('צריך מועד ביצוע')
    if (description.trim().length < DESCRIPTION_MIN) return setError('צריך תיאור קצר של העבודה')

    const form = new FormData()
    form.set('job_type', jobType)
    form.set('region', region)
    form.set('due_date', dueDate)
    form.set('quantity', quantity)
    form.set('material', material)
    form.set('description', description)
    if (image) form.set('image', image.file)

    setBusy(true)
    try {
      const response = await fetch('/api/work/jobs', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפרסום נכשל')
      router.push(`/app/work/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפרסום נכשל')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="text-xl font-extrabold text-ink">פרסום עבודה</h1>

      <section className="space-y-4 rounded-xl border border-hair bg-white p-4">
        <div>
          <span className="text-sm font-medium text-ink">במה צריך עזרה? <span className="text-red-600">*</span></span>
          <div role="radiogroup" aria-label="סוג עבודה" className="mt-1.5 flex flex-wrap gap-2">
            {JOB_TYPES.map((item) => (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={jobType === item.key}
                onClick={() => setJobType(item.key)}
                className={`h-10 rounded-full border px-3.5 text-sm font-semibold ${
                  jobType === item.key ? 'border-[#0E5E5E] bg-[#0E5E5E] text-white' : 'border-hair bg-white text-ink'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">אזור <span className="text-red-600">*</span></span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT}>
              <option value="">בחירה</option>
              {REGIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">ביצוע עד <span className="text-red-600">*</span></span>
            <input type="date" value={dueDate} min={today} max={last} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-ink">כמות / היקף <span className="text-red-600">*</span></span>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} maxLength={80} placeholder="40 לוחות" className={INPUT} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">חומר</span>
          <input value={material} onChange={(e) => setMaterial(e.target.value)} maxLength={120} placeholder="MDF 18 מ״מ, החומר שלנו" className={INPUT} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">תיאור קצר <span className="text-red-600">*</span></span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={DESCRIPTION_MAX}
            placeholder="ארונות לפרויקט מגורים. הקבצים מוכנים (DXF). צריך חיתוך וקידוח, בלי קנטים."
            className="mt-1 w-full rounded-[11px] border border-hair p-3"
          />
          <span className="flex justify-between text-xs text-muted">
            <span>בלי שם לקוח, כתובת או שם הפרויקט</span>
            <span className="tnum">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </span>
        </label>

        <div>
          {image ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="" className="h-28 w-28 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(image.preview)
                  setImage(null)
                }}
                aria-label="הסרת התמונה"
                className="absolute -top-2 -end-2 grid h-7 w-7 place-items-center rounded-full bg-stone-900 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()} className="flex h-12 items-center gap-2 rounded-[11px] border border-dashed border-hair px-4 text-sm font-semibold text-ink">
              <Camera size={18} />
              תמונה אחת (לא חובה)
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void pick(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      </section>

      <p className="text-sm text-muted">
        {dueDate
          ? `העבודה תרד מהלוח ב־${shortDate(isoDay(jobExpiry(dueDate, new Date())))}. אפשר לסגור אותה קודם ב"העבודות שלי".`
          : `העבודה יורדת מהלוח במועד הביצוע, ${JOB_MAX_DAYS} יום לכל היותר.`}
      </p>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={busy} className="h-12 rounded-[11px] bg-[#0E5E5E] text-lg font-bold text-white disabled:opacity-50">
        {busy ? 'מפרסם…' : 'פרסום העבודה'}
      </button>
    </form>
  )
}
