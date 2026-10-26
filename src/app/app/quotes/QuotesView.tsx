'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileText, MessageSquare, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { money } from '@/lib/app/format'
import ConfirmEmailNotice from '@/components/app/ConfirmEmailNotice'
import { QUOTE_KIND_LABEL, QUOTE_STATE_LABEL, quantityText, validLabel, type QuoteRequest } from '@/lib/quotes'

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })
}

/**
 * "הצעות מחיר": what the carpentry asked suppliers for, and their answers.
 *
 * An answered quote goes into the cart at its price and quantity, and from
 * there out with the rest of the order. Nothing here orders anything, and a
 * quote is a supplier's offer, never an invoice.
 */
export default function QuotesView({ ready, quotes, unconfirmedEmail }: { ready: boolean; quotes: QuoteRequest[]; unconfirmedEmail?: string | null }) {
  const router = useRouter()
  const cart = useCart()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answered = quotes.filter((q) => q.state === 'quoted')
  const waiting = quotes.filter((q) => q.state === 'requested')
  const past = quotes.filter((q) => q.state !== 'quoted' && q.state !== 'requested')

  const act = async (quote: QuoteRequest, action: 'cancel' | 'reject') => {
    setBusy(quote.id)
    setError(null)
    try {
      const response = await fetch(`/api/carpenter/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'השינוי לא נשמר')
      if (action === 'reject' && cart.items.some((item) => item.quote_id === quote.id)) cart.removeItem(quote.productId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השינוי לא נשמר')
    } finally {
      setBusy(null)
    }
  }

  const addToCart = (quote: QuoteRequest) => {
    if (quote.unitPrice == null) return
    cart.addQuote({
      id: quote.productId,
      name_he: quote.productName,
      name_en: '',
      base_price_excl_vat: quote.unitPrice,
      supplier_id: quote.supplierId,
      supplier_name: quote.supplierName,
      unit: quote.unit,
      pack_label: quote.packLabel,
      pack_qty: quote.packQty,
      quantity: quote.quantity,
      quote_id: quote.id,
    })
  }

  if (!ready) {
    return (
      <div className="grid gap-3 pt-3">
        <h1 className="m-0 text-2xl font-extrabold">הצעות מחיר</h1>
        <p className="rounded-2xl border border-hair bg-white p-6 text-center text-muted">הצעות מחיר יהיו זמינות בקרוב.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-3">
      <div>
        <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">הצעות מחיר</h1>
        <p className="m-0 mt-1 text-sm text-muted">מבקשים הצעה מדף המוצר. כשהספק עונה, מוסיפים את ההצעה להזמנה ושולחים כרגיל.</p>
      </div>
      {unconfirmedEmail !== undefined && quotes.length > 0 && (
        <ConfirmEmailNotice
          email={unconfirmedEmail}
          title="כדי לקבל את תשובות הספקים גם במייל"
          text="לחיצה על הכפתור שבו מאשרת את הכתובת. עד אז התשובות מופיעות כאן ובפעמון."
        />
      )}

      {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}

      {quotes.length === 0 && (
        <div className="rounded-2xl border-[1.5px] border-dashed border-[#D9CFC1] p-5 text-[15px] text-muted">
          <b className="mb-1 block text-ink">עוד לא ביקשת הצעת מחיר</b>
          אצל ספקים שנותנים מחיר בהצעה, ובכל הזמנה גדולה, מבקשים הצעה מדף המוצר.
          <div className="mt-3">
            <Link href="/app/catalog" className="inline-flex h-11 items-center rounded-[11px] bg-brand px-4 font-bold text-navy">
              לקטלוג
            </Link>
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <section className="grid gap-2.5">
          <h2 className="m-0 text-lg font-bold">התקבלו</h2>
          {answered.map((quote) => {
            const inCart = cart.items.some((item) => item.quote_id === quote.id)
            const total = (quote.unitPrice ?? 0) * quote.quantity
            return (
              <article key={quote.id} className="grid gap-2 rounded-2xl border border-hair bg-white p-3.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/app/product/${quote.productId}`} className="font-bold">
                    {quote.productName}
                  </Link>
                  <span className="text-sm text-muted">{quote.supplierName}</span>
                  {quote.kind === 'volume' && <span className="text-xs font-semibold text-brand-ink">{QUOTE_KIND_LABEL.volume}</span>}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <b className="tnum text-[22px] font-extrabold">{money(total)}</b>
                  <span className="text-sm text-muted">
                    לפני מע״מ · <span className="tnum">{money(quote.unitPrice ?? 0)}</span> ל{quote.unit}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {quantityText(quote.quantity, quote.unit, quote.packLabel, quote.packQty)}
                  {quote.validUntil && <> · בתוקף עד <bdi className="tnum">{validLabel(quote.validUntil)}</bdi></>}
                </div>
                {quote.supplierNote && <p className="m-0 whitespace-pre-line rounded-xl bg-[#FBF9F6] p-2.5 text-sm">{quote.supplierNote}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {inCart ? (
                    <Link href="/app/order" className="inline-flex h-11 items-center gap-1.5 rounded-[11px] border-[1.5px] border-ok px-4 font-bold text-ok-ink">
                      <Check size={17} /> בעגלה · לשליחה
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(quote)}
                      className="inline-flex h-11 items-center gap-1.5 rounded-[11px] bg-brand px-4 font-bold text-navy hover:bg-brand-hover"
                    >
                      <ShoppingBag size={17} /> הוסף להזמנה
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act(quote, 'reject')}
                    disabled={busy === quote.id}
                    className="h-11 rounded-[11px] px-3 text-sm font-semibold text-muted hover:bg-stone-100 disabled:opacity-50"
                  >
                    לא מתאים לי
                  </button>
                  {quote.threadId && (
                    <Link
                      href={`/app/messages/${quote.threadId}`}
                      className="inline-flex h-11 items-center gap-1.5 rounded-[11px] px-3 text-sm font-semibold text-muted hover:bg-stone-100"
                    >
                      <MessageSquare size={16} /> שיחה על הבקשה
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {waiting.length > 0 && (
        <section className="grid gap-2">
          <h2 className="m-0 text-lg font-bold">מחכות לתשובה</h2>
          <div className="overflow-hidden rounded-2xl border border-hair bg-white">
            {waiting.map((quote) => (
              <div key={quote.id} className="flex items-center gap-3 border-t border-hair px-3.5 py-3 first:border-t-0">
                <FileText size={18} className="shrink-0 text-muted" />
                <div className="grid min-w-0 flex-1 leading-snug">
                  <b className="truncate">{quote.productName}</b>
                  <small className="text-[13px] text-muted">
                    {quote.supplierName} · {quantityText(quote.quantity, quote.unit, quote.packLabel, quote.packQty)}
                    {quote.kind === 'volume' ? ` · ${QUOTE_KIND_LABEL.volume}` : ''} · נשלחה {when(quote.createdAt)}
                  </small>
                </div>
                {quote.threadId && (
                  <Link
                    href={`/app/messages/${quote.threadId}`}
                    aria-label="שיחה על הבקשה"
                    title="שיחה על הבקשה"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-muted hover:bg-stone-100"
                  >
                    <MessageSquare size={17} />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => act(quote, 'cancel')}
                  disabled={busy === quote.id}
                  className="h-10 shrink-0 rounded-[10px] px-3 text-sm font-semibold text-muted hover:bg-stone-100 disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="grid gap-2">
          <h2 className="m-0 text-lg font-bold">קודמות</h2>
          <div className="overflow-hidden rounded-2xl border border-hair bg-white">
            {past.map((quote) => (
              <div key={quote.id} className="flex items-center gap-3 border-t border-hair px-3.5 py-3 first:border-t-0">
                <div className="grid min-w-0 flex-1 leading-snug">
                  <span className="truncate font-semibold">{quote.productName}</span>
                  <small className="text-[13px] text-muted">
                    {quote.supplierName} · {when(quote.createdAt)}
                    {quote.state === 'declined' && quote.supplierNote ? ` · ${quote.supplierNote}` : ''}
                  </small>
                </div>
                {quote.orderId ? (
                  <Link href={`/app/orders/${quote.orderId}`} className="shrink-0 text-sm font-semibold text-brand-ink">
                    {QUOTE_STATE_LABEL[quote.state]}
                  </Link>
                ) : (
                  <span className="shrink-0 text-sm text-muted">{QUOTE_STATE_LABEL[quote.state]}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
