'use client'

import Link from 'next/link'
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIls, round2 } from '@/lib/vat'

export default function CartPage() {
  const cart = useCart()

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold text-stone-900">העגלה ריקה</h1>
        <p className="mt-2 text-stone-600">הוסף מוצרים מהקטלוג כדי לשלוח הזמנה.</p>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-900">העגלה</h1>
        <p className="text-sm text-stone-500">{cart.totalItems} פריטים</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white lg:col-span-2">
          {cart.items.map((item) => {
            const lineTotal = round2(item.base_price_excl_vat * item.quantity)

            return (
              <div
                key={item.id}
                className="border-b border-stone-200 p-3 last:border-b-0 sm:flex sm:items-center sm:gap-3"
              >
                <div className="min-w-0 sm:flex-1">
                  <p className="font-bold leading-tight text-stone-900">{item.name_he}</p>
                  {item.name_en && (
                    <p className="truncate text-sm text-stone-500">{item.name_en}</p>
                  )}
                  {/* Excl VAT throughout, matching the catalogue and the order
                      record. The old page multiplied by VAT per line, so the
                      cart disagreed with the price the carpenter had just seen. */}
                  <p className="tnum mt-1 text-sm text-stone-600">
                    {formatIls(item.base_price_excl_vat)} × {item.quantity}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`הפחת כמות עבור ${item.name_he}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="tnum w-10 text-center font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`הוסף כמות עבור ${item.name_he}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <span className="tnum ms-auto text-base font-bold text-stone-900 sm:ms-0 sm:w-28 sm:text-end">
                    {formatIls(lineTotal)}
                  </span>

                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.id)}
                    aria-label={`הסר את ${item.name_he} מהעגלה`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">סכום ללא מע״מ</span>
              <span className="tnum font-semibold">{formatIls(cart.subtotalExclVat)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-stone-600">מע״מ {(cart.vatRate * 100).toFixed(0)}%</span>
              <span className="tnum text-stone-600">{formatIls(cart.vatAmount)}</span>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-stone-200 pt-4">
              <span className="font-bold text-stone-900">סה״כ</span>
              <span className="tnum text-2xl font-bold text-stone-900">
                {formatIls(cart.totalInclVat)}
              </span>
            </div>

            {/* Not "continue to payment": nothing is paid here. The supplier
                confirms, supplies, and invoices directly. */}
            <Link
              href="/carpenter/checkout"
              className="mt-4 flex h-12 items-center justify-center rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
            >
              המשך לשליחת הזמנה
            </Link>
            <p className="mt-2 text-center text-xs text-stone-500">
              אין תשלום כאן. הספק מאשר, מספק, ומוציא חשבונית.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/carpenter/catalog"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-stone-300 text-sm font-semibold text-stone-700"
            >
              <ArrowRight size={16} />
              המשך קנייה
            </Link>
            <button
              type="button"
              onClick={() => cart.clearCart()}
              className="h-11 rounded-lg px-4 text-sm font-medium text-stone-500 hover:text-red-700"
            >
              רוקן
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
