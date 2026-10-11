'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, FileText, X } from 'lucide-react'
import { packText } from '@/lib/app/format'
import { stepOf, type AppOffer } from '@/lib/app/products'
import Stepper from './Stepper'

/**
 * "בקש הצעת מחיר" (T-023): the carpentry asks one supplier for a price on a
 * quantity. For a supplier who shows no prices it is the way to buy; for one
 * who does, it is "הצעה לכמות גדולה". It only sends the request: the answer
 * comes back by mail and under "הצעות מחיר", and nothing is ordered until the
 * carpentry adds it to the cart and sends the order.
 *
 * A sheet from the bottom on a phone, a dialog on a computer.
 */
export default function QuoteRequest({
  product,
  offer,
  packs: initialPacks = 1,
  trigger,
  defaultOpen = false,
}: {
  product: { id: string; name: string; unit: string }
  offer: Pick<AppOffer, 'supplierId' | 'supplierName' | 'packLabel' | 'packQty'>
  packs?: number
  /** Draws the button that opens it. */
  trigger: (open: () => void) => React.ReactNode
  /** Open on arrival, from the agent's "בקש הצעת מחיר". */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [packs, setPacks] = useState(initialPacks)
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const step = stepOf(offer)
  const pack = packText(offer.packLabel, offer.packQty, product.unit)

  const show = () => {
    setOpen(true)
    setPacks(initialPacks)
    setState('idle')
    setError(null)
  }

  const send = async () => {
    setState('sending')
    setError(null)
    try {
      const response = await fetch('/api/carpenter/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, supplier_id: offer.supplierId, quantity: packs * step, note }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'הבקשה לא נשלחה')
      setState('sent')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הבקשה לא נשלחה')
      setState('idle')
    }
  }

  return (
    <>
      {trigger(show)}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,20,28,.42)] md:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="בקשת הצעת מחיר"
            className="max-h-[88%] w-full overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-3 md:w-[480px] md:rounded-[18px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[19px] font-bold">בקשת הצעת מחיר</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="סגירה" className="grid h-9 w-9 place-items-center rounded-full text-muted">
                <X size={20} />
              </button>
            </div>

            {state === 'sent' ? (
              <div className="grid justify-items-center gap-2 py-4 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-ok-soft text-ok">
                  <Check size={26} strokeWidth={2.4} />
                </span>
                <b className="text-[17px]">הבקשה נשלחה ל{offer.supplierName}</b>
                <p className="m-0 max-w-[36ch] text-sm text-muted">כשהספק יענה תקבלו מייל, וההצעה תחכה לכם בהצעות המחיר. משם מוסיפים אותה להזמנה.</p>
                <Link href="/app/quotes" className="mt-1 inline-flex h-11 items-center rounded-[11px] bg-brand px-4 font-bold text-navy">
                  להצעות המחיר שלי
                </Link>
              </div>
            ) : (
              <div className="mt-2 grid gap-3">
                <p className="m-0 text-[15px]">
                  <b>{product.name}</b>
                  <span className="text-muted"> · {offer.supplierName}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Stepper value={packs} onChange={(n) => setPacks(Math.max(1, n))} min={1} label={product.name} />
                  <span className="text-sm text-muted">
                    {pack ? `${pack} · ` : ''}
                    <span className="tnum">{packs * step}</span> {product.unit}
                  </span>
                </div>
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">הערה לספק (לא חובה)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={600}
                    placeholder="לדוגמה: אספקה לאתר בנתניה, צריך עד יום חמישי"
                    className="rounded-[10px] border-[1.5px] border-hair px-3 py-2 text-[15px]"
                  />
                </label>
                {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
                <button
                  type="button"
                  onClick={send}
                  disabled={state === 'sending'}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[11px] bg-brand px-4 font-bold text-navy hover:bg-brand-hover disabled:opacity-60"
                >
                  <FileText size={18} /> {state === 'sending' ? 'שולח…' : 'שליחת הבקשה לספק'}
                </button>
                <p className="m-0 text-[13px] text-muted">הספק עונה במחיר ליחידה לפני מע״מ ועד מתי הוא בתוקף. שום דבר לא מוזמן עד שתשלחו הזמנה.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
