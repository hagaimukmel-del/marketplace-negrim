'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Phone } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { QUOTE_MAX_VALID_DAYS, QUOTE_STATE_LABEL, israelDate, quantityText, validLabel, type SupplierQuoteRequest } from '@/lib/quotes'
import { callApi, jsonInit, type SupplierQuotes } from '../types'
import type { Notify } from '../SupplierApp'

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })
}

function Answer({ quote, notify }: { quote: SupplierQuoteRequest; notify: Notify }) {
  const router = useRouter()
  const today = israelDate()
  const [price, setPrice] = useState('')
  const [validUntil, setValidUntil] = useState(addDays(today, 14))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const value = Number(price)
  const priced = price.trim() !== '' && Number.isFinite(value) && value > 0

  const send = async (action: 'answer' | 'decline') => {
    setBusy(true)
    try {
      await callApi(
        `/api/supplier/quotes/${quote.id}`,
        jsonInit('POST', action === 'answer' ? { action, unit_price: value, valid_until: validUntil, note } : { action, note })
      )
      notify(action === 'answer' ? 'ההצעה נשלחה לנגרייה' : 'הנגרייה עודכנה שאין הצעה')
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'השליחה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="border-t border-stone-100 px-4 py-3 first:border-t-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900">{quote.productName}</p>
          <p className="text-sm text-stone-600">
            {quantityText(quote.quantity, quote.unit, quote.packLabel, quote.packQty)} · {quote.carpenter}
            {quote.city ? `, ${quote.city}` : ''} · {when(quote.createdAt)}
          </p>
        </div>
        {quote.phone && (
          <a
            href={`tel:${quote.phone}`}
            aria-label={`להתקשר ל${quote.carpenter}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
          >
            <Phone size={17} />
          </a>
        )}
      </div>
      {quote.note && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-stone-50 p-2.5 text-sm text-stone-800">{quote.note}</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">מחיר ל{quote.unit}, ללא מע״מ (₪)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            dir="ltr"
            placeholder="0.00"
            className="tnum mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-end"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">בתוקף עד</span>
          <input
            type="date"
            value={validUntil}
            min={today}
            max={addDays(today, QUOTE_MAX_VALID_DAYS)}
            onChange={(e) => setValidUntil(e.target.value)}
            className="tnum mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">הערה לנגרייה (לא חובה)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={600}
            placeholder="לדוגמה: כולל הובלה, אספקה תוך 3 ימי עבודה"
            className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3"
          />
        </label>
      </div>
      {priced && (
        <p className="mt-2 text-sm text-stone-700">
          סה״כ לכמות: <b className="tnum">{formatIls(value * quote.quantity)}</b> ללא מע״מ
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send('answer')}
          disabled={busy || !priced || !validUntil}
          className="h-12 flex-1 rounded-lg bg-emerald-700 px-5 font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:flex-none"
        >
          {busy ? 'שולח…' : 'שלח הצעה'}
        </button>
        <button
          type="button"
          onClick={() => send('decline')}
          disabled={busy}
          className="h-12 rounded-lg px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100"
        >
          לא יכול להציע
        </button>
      </div>
    </li>
  )
}

/**
 * Quote requests from carpentries (T-023), at the top of the orders tab.
 *
 * A request waits for one answer: a price per base unit excl. VAT and how long
 * it holds, or a decline. The carpentry gets it by mail and can order it from
 * its cart; the order then arrives here like any other, at the quoted price.
 */
export default function QuoteRequests({ quotes, notify }: { quotes: SupplierQuotes; notify: Notify }) {
  const [showPast, setShowPast] = useState(false)
  if (!quotes.ready || quotes.quotes.length === 0) return null
  const open = quotes.quotes.filter((quote) => quote.state === 'requested')
  const past = quotes.quotes.filter((quote) => quote.state !== 'requested').slice(0, 20)

  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white">
      <div className="flex items-center gap-2 bg-amber-50 px-4 py-3">
        <FileText size={18} className="text-amber-800" />
        <h2 className="font-bold text-stone-900">בקשות הצעת מחיר</h2>
        {open.length > 0 && (
          <span className="tnum rounded-full bg-amber-600 px-2 text-xs font-bold text-white">{open.length}</span>
        )}
      </div>
      {open.length > 0 ? (
        <ul>
          {open.map((quote) => (
            <Answer key={quote.id} quote={quote} notify={notify} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-600">אין בקשות שמחכות לתשובה.</p>
      )}
      {past.length > 0 && (
        <div className="border-t border-stone-100">
          <button type="button" onClick={() => setShowPast((v) => !v)} className="w-full px-4 py-2.5 text-start text-sm font-semibold text-stone-600 hover:bg-stone-50">
            {showPast ? 'הסתר הצעות קודמות' : `הצעות קודמות (${past.length})`}
          </button>
          {showPast && (
            <ul>
              {past.map((quote) => (
                <li key={quote.id} className="flex items-center gap-2 border-t border-stone-100 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {quote.productName} · {quote.carpenter}
                  </span>
                  {quote.unitPrice != null && (
                    <span className="tnum shrink-0 text-stone-600">
                      {formatIls(quote.unitPrice)}
                      {quote.validUntil ? ` · עד ${validLabel(quote.validUntil)}` : ''}
                    </span>
                  )}
                  <span className="shrink-0 font-semibold text-stone-700">{QUOTE_STATE_LABEL[quote.state]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
