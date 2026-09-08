'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Send } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCheckout, type PaymentTerms } from '@/lib/checkout-context'
import { formatIls, round2 } from '@/lib/vat'

/**
 * Payment terms are the supplier's to set — it fulfils the order and invoices
 * the carpenter directly. This field records what the carpenter is asking for,
 * not something the platform agrees to, which is why it is labelled as a
 * request and says the supplier confirms it.
 *
 * The page previously offered "שיטת תשלום — כרטיס אשראי / העברה / מזומן",
 * implying money changes hands here. It does not.
 */
const TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'שוטף+30', label: 'שוטף + 30' },
  { value: 'שוטף+60', label: 'שוטף + 60' },
  { value: 'מזומן במסירה', label: 'תשלום במסירה' },
]

function Field({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        {...props}
        required={required}
        className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
      />
    </label>
  )
}

export default function CheckoutPage() {
  const cart = useCart()
  const checkout = useCheckout()
  const router = useRouter()
  const [sent, setSent] = useState(false)

  if (cart.items.length === 0 && !sent) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold text-stone-900">העגלה ריקה</h1>
        <Link
          href="/carpenter/catalog"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-stone-900 px-5 font-semibold text-white"
        >
          <ArrowRight size={17} />
          לקטלוג
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const { orderId } = await checkout.submitOrder(cart.items)
      setSent(true)
      cart.clearCart()
      router.push(`/carpenter/orders/${orderId}`)
    } catch {
      // checkout.error already carries the message for display below
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-stone-900">שליחת הזמנה</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-stone-900">פרטי הנגרייה</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="שם מלא"
                required
                value={checkout.formData.name || ''}
                onChange={(e) => checkout.updateForm({ name: e.target.value })}
                placeholder="דב כהן"
              />
              <Field
                label="שם העסק"
                value={checkout.formData.businessName || ''}
                onChange={(e) => checkout.updateForm({ businessName: e.target.value })}
                placeholder="נגרות כהן"
              />
              <Field
                label="טלפון"
                required
                type="tel"
                inputMode="tel"
                value={checkout.formData.phone || ''}
                onChange={(e) => checkout.updateForm({ phone: e.target.value })}
                placeholder="050-1234567"
              />
              <Field
                label="מייל"
                required
                type="email"
                inputMode="email"
                value={checkout.formData.email || ''}
                onChange={(e) => checkout.updateForm({ email: e.target.value })}
                placeholder="dov@example.com"
              />
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-stone-900">כתובת אספקה</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="כתובת"
                  required
                  value={checkout.formData.address || ''}
                  onChange={(e) => checkout.updateForm({ address: e.target.value })}
                  placeholder="רחוב הנגר 12, אזור תעשייה"
                />
              </div>
              <Field
                label="עיר"
                required
                value={checkout.formData.city || ''}
                onChange={(e) => checkout.updateForm({ city: e.target.value })}
                placeholder="תל אביב"
              />
              <Field
                label="מיקוד"
                value={checkout.formData.zipCode || ''}
                onChange={(e) => checkout.updateForm({ zipCode: e.target.value })}
                placeholder="6910000"
              />
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-bold text-stone-900">תנאי תשלום מבוקשים</h2>
            <p className="mt-1 text-sm text-stone-600">
              הספק קובע את התנאים הסופיים ומוציא לך חשבונית ישירות. אין תשלום באתר.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TERMS.map((term) => {
                const active = checkout.formData.paymentTerms === term.value
                return (
                  <label
                    key={term.value}
                    className={`flex h-11 cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold ${
                      active
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-stone-300 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="terms"
                      className="sr-only"
                      checked={active}
                      onChange={() => checkout.updateForm({ paymentTerms: term.value })}
                    />
                    {term.label}
                  </label>
                )
              })}
            </div>
          </section>

          {checkout.error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{checkout.error}</p>
          )}

          <button
            type="submit"
            disabled={checkout.isSubmitting}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Send size={18} />
            {checkout.isSubmitting ? 'שולח…' : 'שלח הזמנה לספק'}
          </button>
        </form>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 font-bold text-stone-900">ההזמנה</h2>

          <div className="space-y-1.5 border-b border-stone-200 pb-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-stone-700">
                  {item.name_he} <span className="text-stone-400">×{item.quantity}</span>
                </span>
                <span className="tnum shrink-0 font-medium">
                  {formatIls(round2(item.base_price_excl_vat * item.quantity))}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">ללא מע״מ</span>
              <span className="tnum font-semibold">{formatIls(cart.subtotalExclVat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">מע״מ {(cart.vatRate * 100).toFixed(0)}%</span>
              <span className="tnum text-stone-600">{formatIls(cart.vatAmount)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-stone-200 pt-3">
            <span className="font-bold text-stone-900">סה״כ</span>
            <span className="tnum text-xl font-bold text-stone-900">
              {formatIls(cart.totalInclVat)}
            </span>
          </div>

          <p className="mt-3 rounded-lg bg-stone-100 p-2.5 text-xs text-stone-600">
            זו הזמנת רכש. הסכום המחייב הוא זה שיופיע בחשבונית של הספק.
          </p>

          <Link
            href="/carpenter/cart"
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 text-sm font-semibold text-stone-700"
          >
            <ArrowRight size={16} />
            חזור לעגלה
          </Link>
        </aside>
      </div>
    </div>
  )
}
