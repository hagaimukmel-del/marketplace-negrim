'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Trash2, Check, Plus, X } from 'lucide-react'
import { callApi, jsonInit, type SupplierProfile } from '../types'
import type { Notify } from '../SupplierApp'

const INPUT = 'mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3'
const MAX_COPIES = 5

/**
 * Who else gets each new order by email: the warehouse, the bookkeeper.
 *
 * They get a copy without the confirm button, so nobody has to pass on the
 * console's sign-in link (which would also let them change prices). Saves on
 * its own, apart from the details form above it.
 */
function OrderCopies({ profile, notify }: { profile: SupplierProfile; notify: Notify }) {
  const router = useRouter()
  const [emails, setEmails] = useState<string[]>(profile.order_cc_emails.length ? profile.order_cc_emails : [''])
  const [saved, setSaved] = useState(() => JSON.stringify(profile.order_cc_emails))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleaned = emails.map((email) => email.trim()).filter(Boolean)
  const dirty = JSON.stringify(cleaned) !== saved

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await callApi('/api/supplier/profile', jsonInit('PATCH', { order_cc_emails: cleaned }))
      setSaved(JSON.stringify(cleaned))
      notify('הנמענים נשמרו')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-bold text-stone-900">עוד מי שמקבל את ההזמנות</h2>
      <p className="mt-0.5 text-base text-stone-600">
        מחסן או הנהלת חשבונות יקבלו העתק של כל הזמנה חדשה במייל, בלי כפתור אישור ובלי גישה לחשבון.
        {profile.email ? ` האישור נשאר אצל ${profile.email}.` : ''}
      </p>
      <div className="mt-3 space-y-2">
        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmails((prev) => prev.map((value, i) => (i === index ? e.target.value : value)))}
              type="email"
              inputMode="email"
              dir="ltr"
              placeholder="warehouse@example.co.il"
              aria-label={`נמען ${index + 1}`}
              className="h-12 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-start"
            />
            <button
              type="button"
              onClick={() => setEmails((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)))}
              aria-label="הסר נמען"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
      {emails.length < MAX_COPIES && (
        <button
          type="button"
          onClick={() => setEmails((prev) => [...prev, ''])}
          className="mt-2 flex h-10 items-center gap-1 rounded-lg px-2 text-base font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          <Plus size={16} />
          עוד נמען
        </button>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-base text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy || !dirty}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:w-auto sm:px-8"
      >
        <Check size={18} />
        {busy ? 'שומר…' : dirty ? 'שמור נמענים' : 'הכל שמור'}
      </button>
    </form>
  )
}

/**
 * Who the supplier is, as carpenters and the operator see them.
 *
 * The logo uploads the moment a file is picked — there is nothing to confirm
 * about a picture, and a separate save step is one more thing to forget. The
 * details save together. The company number is shown but never editable: it is
 * the entity that was approved and that invoices the carpenter.
 */
export default function BusinessTab({ profile, notify }: { profile: SupplierProfile; notify: Notify }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)

  const initial = {
    company_name: profile.company_name,
    contact_name: profile.contact_name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    sells_note: profile.sells_note ?? '',
  }
  const [form, setForm] = useState(initial)
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial))
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof initial, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const dirty = JSON.stringify(form) !== snapshot

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await callApi('/api/supplier/profile', jsonInit('PATCH', form))
      setSnapshot(JSON.stringify(form))
      notify('הפרטים נשמרו')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoBusy(true)
    try {
      const data = new FormData()
      data.append('file', file)
      await callApi('/api/supplier/profile', { method: 'PATCH', body: data })
      notify('הלוגו עודכן')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ההעלאה נכשלה', 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  const removeLogo = async () => {
    setLogoBusy(true)
    try {
      await callApi('/api/supplier/profile', jsonInit('PATCH', { logo_url: null }))
      notify('הלוגו הוסר')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ההסרה נכשלה', 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={logoBusy}
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-400"
          aria-label="העלאת לוגו"
        >
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <ImagePlus size={26} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900">לוגו</p>
          <p className="text-base text-stone-600">מופיע לנגרים ליד המוצרים שלך.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={logoBusy}
              className="h-9 rounded-lg border border-stone-300 px-3 text-base font-semibold text-stone-700 disabled:opacity-50"
            >
              {logoBusy ? 'מעלה…' : profile.logo_url ? 'החלף' : 'העלה לוגו'}
            </button>
            {profile.logo_url && (
              <button
                type="button"
                onClick={removeLogo}
                disabled={logoBusy}
                className="flex h-9 items-center gap-1 rounded-lg px-2 text-base text-stone-500 hover:bg-stone-100"
              >
                <Trash2 size={14} />
                הסר
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            void uploadLogo(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </section>

      <form onSubmit={save} className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-base font-medium text-stone-700">
              שם החברה <span className="text-red-600">*</span>
            </span>
            <input
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              required
              className={INPUT}
            />
          </label>

          <div className="sm:col-span-2">
            <span className="text-base font-medium text-stone-700">ח.פ / ע.מ</span>
            <p className="tnum mt-1 flex h-12 items-center rounded-lg bg-stone-100 px-3 text-stone-600">
              {profile.business_id}
            </p>
            <span className="mt-1 block text-sm text-stone-500">
              לשינוי מספר עוסק צריך לפנות אלינו.
            </span>
          </div>

          <label className="block">
            <span className="text-base font-medium text-stone-700">
              טלפון <span className="text-red-600">*</span>
            </span>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              type="tel"
              inputMode="tel"
              className={`tnum ${INPUT}`}
            />
          </label>

          <label className="block">
            <span className="text-base font-medium text-stone-700">מייל לקבלת הזמנות</span>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              inputMode="email"
              className={INPUT}
            />
          </label>

          <label className="block">
            <span className="text-base font-medium text-stone-700">איש קשר</span>
            <input
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              className={INPUT}
            />
          </label>

          <label className="block">
            <span className="text-base font-medium text-stone-700">עיר</span>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={INPUT} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-base font-medium text-stone-700">כתובת העסק</span>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={INPUT}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-base font-medium text-stone-700">מה אתם מוכרים</span>
            <textarea
              value={form.sells_note}
              onChange={(e) => set('sells_note', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-base text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy || !dirty}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:w-auto sm:px-8"
        >
          <Check size={18} />
          {busy ? 'שומר…' : dirty ? 'שמור שינויים' : 'הכל שמור'}
        </button>
      </form>

      {profile.order_cc_ready && <OrderCopies profile={profile} notify={notify} />}
    </div>
  )
}
