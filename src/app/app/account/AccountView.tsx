'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Link2, LogOut, Mail } from 'lucide-react'
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

type Field = 'business_name' | 'contact_name' | 'phone' | 'email' | 'address' | 'city'

/**
 * The carpentry's own corner. The personal link matters more than it looks: it
 * is the account — there is no password to recover — so this is the one place
 * it can always be found, copied, or sent to another device.
 */
export default function AccountView({ carpenter, origin }: { carpenter: AccountCarpenter; origin: string }) {
  const router = useRouter()
  const cart = useCart()
  const [form, setForm] = useState<Record<Field, string>>({
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
  const [sending, setSending] = useState(false)
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const personalLink = `${origin}/o/${carpenter.token}`

  const set = (key: Field, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/carpenter/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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

  const sendToEmail = async () => {
    setSending(true)
    setDeviceMessage(null)
    try {
      const response = await fetch('/api/carpenter/login-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ self: true }) })
      const data = await response.json().catch(() => ({}))
      setDeviceMessage(response.ok ? data.message : data.error || 'השליחה נכשלה')
    } catch {
      setDeviceMessage('השליחה נכשלה')
    } finally {
      setSending(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked; the link is on screen to select by hand.
    }
  }

  /** Both halves, or it is not a sign-out: the session cookie and the token this browser kept. */
  const signOut = async () => {
    setLeaving(true)
    try {
      await fetch('/api/carpenter/session', { method: 'DELETE' })
    } catch {
      // Offline. The local half still goes; the cookie expires by itself.
    }
    forgetCarpenter()
    cart.clearCart()
    router.replace('/app/catalog')
    router.refresh()
  }

  const input = 'mt-1 h-12 w-full rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-base focus:border-navy'
  const label = 'text-sm font-bold'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-1">
      <section>
        <h1 className="m-0 text-2xl font-extrabold text-navy md:text-[28px]">הנגרייה שלי</h1>
        <div className="text-[14.5px] text-muted">{carpenter.business_name}</div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <form onSubmit={save} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-hair bg-white p-4">
          <h2 className="m-0 text-base font-bold">הפרטים שלך</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={label}>שם הנגרייה</span>
              <input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} required className={input} />
            </label>
            <label className="block">
              <span className={label}>טלפון</span>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required type="tel" inputMode="tel" className={`tnum ${input}`} />
            </label>
            <label className="block">
              <span className={label}>איש קשר</span>
              <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} className={input} />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>מייל</span>
              <input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" className={input} />
              <span className="mt-1 block text-[13px] text-muted">לכאן מגיעים אישורי הספקים וקישורי כניסה.</span>
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>כתובת לאספקה</span>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="רחוב ומספר, אזור תעשייה" className={input} />
              <span className="mt-1 block text-[13px] text-muted">ממולאת בכל הזמנה. אפשר לשנות להזמנה בודדת בלי לשנות כאן.</span>
            </label>
            <label className="block">
              <span className={label}>עיר</span>
              <input value={form.city} onChange={(e) => set('city', e.target.value)} className={input} />
            </label>
          </div>
          {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
          <button
            type="submit"
            disabled={busy || !form.business_name.trim() || !form.phone.trim()}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[11px] bg-brand px-5 font-bold text-navy hover:bg-brand-hover disabled:opacity-50 sm:justify-self-start"
          >
            {saved && <Check size={18} strokeWidth={2.4} />}
            {busy ? 'שומר…' : saved ? 'נשמר' : 'שמירת שינויים'}
          </button>
        </form>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 rounded-2xl border border-hair bg-white p-4">
            <h2 className="m-0 text-base font-bold">חיבור ממכשיר נוסף</h2>
            <p className="m-0 text-sm text-muted">נשלח קישור כניסה למייל שלך. פותחים אותו במחשב או בטלפון השני — וזהו.</p>
            <button type="button" onClick={sendToEmail} disabled={sending} className="inline-flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold disabled:opacity-50">
              <Mail size={18} /> {sending ? 'שולח…' : 'שלחו לי קישור כניסה למייל'}
            </button>
            {deviceMessage && <p className="m-0 text-sm text-ok-ink">{deviceMessage}</p>}

            <div className="mt-1 border-t border-hair pt-3">
              <h3 className="m-0 text-sm font-bold">הקישור האישי שלך</h3>
              <p className="m-0 mt-0.5 text-[13px] text-muted">זה החשבון — אין סיסמה לשחזר. אפשר לשמור אותו במועדפים.</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-warm px-2.5 py-2.5 text-xs text-muted">
                  <Link2 size={14} className="shrink-0" />
                  <span dir="ltr" className="min-w-0 truncate font-mono">
                    {personalLink}
                  </span>
                </span>
                <button type="button" onClick={copyLink} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-sm font-bold">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'הועתק' : 'העתקה'}
                </button>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-2xl border border-hair bg-white p-4">
            <h2 className="m-0 text-base font-bold">יציאה</h2>
            <p className="m-0 text-sm text-muted">מנתק את הדפדפן הזה ומרוקן את ההזמנה שבהכנה. הקישור האישי ממשיך לעבוד.</p>
            <button type="button" onClick={signOut} disabled={leaving} className="inline-flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold text-muted disabled:opacity-50">
              <LogOut size={18} /> {leaving ? 'יוצא…' : 'יציאה מהחשבון'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
