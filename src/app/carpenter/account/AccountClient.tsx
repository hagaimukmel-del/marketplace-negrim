'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, LogOut, Link2, ExternalLink } from 'lucide-react'
import { forgetCarpenter } from '@/lib/carpenter-session'
import { useCart } from '@/lib/cart-context'

export interface AccountCarpenter {
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  token: string
}

/**
 * The carpenter's own corner: their details, their link, and the way out.
 *
 * The link matters more than it looks. It is the account — there is no password
 * to recover — so this is the one place it can always be found and copied to a
 * second phone or a colleague.
 */
export default function AccountClient({
  carpenter,
  origin,
}: {
  carpenter: AccountCarpenter
  origin: string
}) {
  const router = useRouter()
  const cart = useCart()

  const [form, setForm] = useState({
    business_name: carpenter.business_name,
    contact_name: carpenter.contact_name ?? '',
    phone: carpenter.phone ?? '',
    email: carpenter.email ?? '',
    address: carpenter.address ?? '',
    city: carpenter.city ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const personalLink = `${origin}/o/${carpenter.token}`

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/carpenter/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'השמירה נכשלה')
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked. The link is on screen and can be selected by hand.
    }
  }

  /**
   * Both halves, or it is not a sign-out: the cookie is what the server checks,
   * the token in localStorage is what checkout attaches to an order. Clearing
   * one and not the other leaves someone half signed in — no prices, but still
   * ordering under the previous carpenter's name.
   */
  const signOut = async () => {
    setLeaving(true)
    try {
      await fetch('/api/carpenter/session', { method: 'DELETE' })
    } catch {
      // Offline. The local half still goes and the cookie expires by itself.
    }
    forgetCarpenter()
    cart.clearCart()
    router.replace('/carpenter/catalog')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-stone-900">האזור האישי</h1>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">הקישור האישי שלך</h2>
        <p className="mt-1 text-sm text-stone-600">
          זה החשבון — אין סיסמה לשחזר. שמור אותו במועדפים, ואפשר לשלוח אותו לעצמך לטלפון שני.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
            <Link2 size={14} className="shrink-0 text-stone-400" />
            <span className="min-w-0 break-all font-mono">{personalLink}</span>
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="flex h-11 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'הועתק' : 'העתק'}
          </button>
          <Link
            href={`/o/${carpenter.token}`}
            className="flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            <ExternalLink size={16} />
            לדף שלי
          </Link>
        </div>
      </section>

      <form onSubmit={save} className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">הפרטים שלך</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">
              שם הנגרייה <span className="text-red-600">*</span>
            </span>
            <input
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              required
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              טלפון <span className="text-red-600">*</span>
            </span>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              type="tel"
              inputMode="tel"
              className="tnum mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">איש קשר</span>
            <input
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">מייל</span>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">כתובת לאספקה</span>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="רחוב הנגר 12, אזור תעשייה"
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
            <span className="mt-1 block text-xs text-stone-500">
              ממולאת מראש בכל הזמנה. אפשר לשנות להזמנה בודדת בלי לשנות אותה כאן.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">עיר</span>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 px-3"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy || !form.business_name.trim() || !form.phone.trim()}
          className="mt-4 flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-6 font-bold text-white disabled:opacity-50"
        >
          <Check size={17} />
          {busy ? 'שומר…' : saved ? 'נשמר' : 'שמור שינויים'}
        </button>
      </form>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">יציאה</h2>
        <p className="mt-1 text-sm text-stone-600">
          מנתק את הדפדפן הזה ומרוקן את העגלה. הקישור האישי ממשיך לעבוד — פתיחה שלו מחברת אותך
          שוב.
        </p>
        <button
          type="button"
          onClick={signOut}
          disabled={leaving}
          className="mt-3 flex h-12 items-center gap-2 rounded-lg border border-stone-300 px-5 font-semibold text-stone-700 disabled:opacity-50"
        >
          <LogOut size={17} />
          {leaving ? 'יוצא…' : 'יציאה מהחשבון'}
        </button>
      </section>
    </div>
  )
}
