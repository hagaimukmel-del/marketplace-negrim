'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { formatIls, withVat } from '@/lib/vat'
import {
  CHARGE_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  addMonths,
  monthLabel,
  type BillingTotals,
  type ChargeKind,
  type ChargeLine,
  type PaymentMethod,
  type SupplierBilling,
} from '@/lib/billing-rules'

interface Defaults {
  monthly: number
  promoWeek: number
  billingStart: string
}

const FIELD = 'h-9 min-w-0 rounded-lg border border-stone-300 bg-white px-2 text-base'
const BUTTON = 'h-9 rounded-lg bg-stone-900 px-3 text-base font-semibold text-white disabled:opacity-50'

async function send(method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch('/api/admin/billing', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (response.ok) return null
  const data = await response.json().catch(() => ({}))
  return data.error ?? 'הפעולה נכשלה'
}

function todayIsrael(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
}

/** "₪350.00", or "זכות ₪50.00" for a negative balance. */
function Balance({ value, strong }: { value: number; strong?: boolean }) {
  if (value === 0) return <span className="text-stone-400">—</span>
  const credit = value < 0
  return (
    <span className={`${strong ? 'font-bold' : 'font-semibold'} ${credit ? 'text-emerald-700' : 'text-red-700'}`}>
      {credit ? `זכות ${formatIls(-value)}` : formatIls(value)}
    </span>
  )
}

/** Owed, with what was paid against it underneath. */
function Charge({ line, extra }: { line: ChargeLine; extra?: string }) {
  if (line.owed === 0 && line.paid === 0) return <span className="text-stone-400">—</span>
  return (
    <div>
      <div className="font-semibold text-stone-900">{formatIls(line.owed)}</div>
      <div className="text-sm text-stone-500">
        שולם {formatIls(line.paid)}
        {extra ? ` · ${extra}` : ''}
      </div>
    </div>
  )
}

function PlanForm({ row, defaults, ready, onDone }: { row: SupplierBilling; defaults: Defaults; ready: boolean; onDone: () => void }) {
  const [monthly, setMonthly] = useState(String(row.plan.monthly))
  const [starts, setStarts] = useState(row.plan.startsMonth)
  const [ends, setEnds] = useState(row.plan.endsMonth ?? '')
  const [note, setNote] = useState(row.plan.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (reset: boolean) => {
    setBusy(true)
    setError(null)
    const failed = await send(
      'PUT',
      reset
        ? { supplier_id: row.supplier.id, reset: true }
        : { supplier_id: row.supplier.id, monthly_excl_vat: monthly, starts_month: starts, ends_month: ends, note },
    )
    setBusy(false)
    if (failed) setError(failed)
    else onDone()
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-stone-900">מנוי</h3>
      <p className="text-sm text-stone-600">
        {row.plan.monthly === 0
          ? 'לא משלם מנוי.'
          : `${formatIls(row.plan.monthly)} לחודש מ${monthLabel(row.plan.startsMonth)}${row.plan.endsMonth ? ` עד ${monthLabel(row.plan.endsMonth)}` : ''}.`}{' '}
        {row.plan.custom
          ? 'נקבע ידנית.'
          : `ברירת מחדל: ספק מאושר משלם ${formatIls(defaults.monthly)} מ${monthLabel(defaults.billingStart)} או מחודש האישור, המאוחר מביניהם.`}
        {row.plan.note ? ` הערה: ${row.plan.note}` : ''}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm text-stone-600">
          לחודש, לפני מע״מ (0 = פטור)
          <input className={`${FIELD} w-28`} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          מחודש
          <input className={`${FIELD} w-36`} type="month" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          עד חודש (לא חובה)
          <input className={`${FIELD} w-36`} type="month" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <label className="flex min-w-40 flex-1 flex-col text-sm text-stone-600">
          הערה
          <input className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className={BUTTON} disabled={busy || !ready} onClick={() => save(false)}>
          שמירה
        </button>
        {row.plan.custom ? (
          <button
            className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-base font-semibold text-stone-700 disabled:opacity-50"
            disabled={busy || !ready}
            onClick={() => save(true)}
          >
            חזרה לברירת מחדל
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

function PaymentForm({ row, month, defaults, ready, onDone }: { row: SupplierBilling; month: string; defaults: Defaults; ready: boolean; onDone: () => void }) {
  const [kind, setKind] = useState<ChargeKind>('subscription')
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayIsrael())
  const [coversFrom, setCoversFrom] = useState(month)
  const [coversMonths, setCoversMonths] = useState('1')
  const [installments, setInstallments] = useState(false)
  const [installmentNo, setInstallmentNo] = useState('1')
  const [installmentsTotal, setInstallmentsTotal] = useState('12')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountNumber = Number(amount)

  const fillYear = () => {
    setKind('subscription')
    setAmount(String(defaults.monthly * 12))
    setCoversMonths('12')
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    const failed = await send('POST', {
      supplier_id: row.supplier.id,
      kind,
      amount_excl_vat: amount,
      paid_on: paidOn,
      covers_from: coversFrom,
      covers_months: coversMonths,
      installment_no: installments ? installmentNo : null,
      installments_total: installments ? installmentsTotal : null,
      method,
      note,
    })
    setBusy(false)
    if (failed) {
      setError(failed)
      return
    }
    setAmount('')
    setNote('')
    onDone()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-stone-900">רישום תשלום</h3>
        <button type="button" className="text-sm font-semibold text-emerald-700 underline" onClick={fillYear}>
          שנה מראש ({formatIls(defaults.monthly * 12)})
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-emerald-700 underline"
          onClick={() => {
            setKind('promo')
            setAmount(String(defaults.promoWeek))
            setCoversMonths('1')
          }}
        >
          שבוע פרסום ({formatIls(defaults.promoWeek)})
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm text-stone-600">
          על מה
          <select className={FIELD} value={kind} onChange={(e) => setKind(e.target.value as ChargeKind)}>
            <option value="subscription">{CHARGE_KIND_LABEL.subscription}</option>
            <option value="promo">{CHARGE_KIND_LABEL.promo}</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          סכום לפני מע״מ
          <input className={`${FIELD} w-28`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          תאריך תשלום
          <input className={`${FIELD} w-40`} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          עבור חודש
          <input className={`${FIELD} w-36`} type="month" value={coversFrom} onChange={(e) => setCoversFrom(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          מכסה חודשים
          <input className={`${FIELD} w-20`} inputMode="numeric" value={coversMonths} onChange={(e) => setCoversMonths(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          אמצעי
          <select className={FIELD} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}>
            <option value="">—</option>
            {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((key) => (
              <option key={key} value={key}>
                {PAYMENT_METHOD_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex h-9 items-center gap-1.5 text-sm text-stone-600">
          <input type="checkbox" checked={installments} onChange={(e) => setInstallments(e.target.checked)} />
          חלק מתשלומים
        </label>
        {installments ? (
          <span className="flex items-center gap-1.5 text-sm text-stone-600">
            תשלום
            <input className={`${FIELD} w-14`} inputMode="numeric" value={installmentNo} onChange={(e) => setInstallmentNo(e.target.value)} />
            מתוך
            <input className={`${FIELD} w-14`} inputMode="numeric" value={installmentsTotal} onChange={(e) => setInstallmentsTotal(e.target.value)} />
          </span>
        ) : null}
        <label className="flex min-w-40 flex-1 flex-col text-sm text-stone-600">
          הערה (מספר קבלה, אסמכתא)
          <input className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className={BUTTON} disabled={busy || !ready || !amount} onClick={submit}>
          רישום
        </button>
      </div>
      <p className="text-sm text-stone-500">
        {Number.isFinite(amountNumber) && amountNumber > 0 ? `כולל מע״מ: ${formatIls(withVat(amountNumber))}. ` : ''}
        תשלום שמכסה כמה חודשים מתחלק שווה ביניהם. בתשלומים: רושמים כל תשלום כשהוא נכנס, על החודשים שהוא מכסה.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

function Payments({ row, ready, onDone }: { row: SupplierBilling; ready: boolean; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)

  const remove = async (id: string) => {
    if (!window.confirm('למחוק את התשלום?')) return
    setError(null)
    const failed = await send('DELETE', { id })
    if (failed) setError(failed)
    else onDone()
  }

  if (!row.payments.length) return <p className="text-sm text-stone-500">עוד לא נרשמו תשלומים.</p>
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-stone-900">תשלומים שנרשמו</h3>
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white text-sm">
        {row.payments.map((payment) => (
          <li key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="tnum font-semibold text-stone-900">{formatIls(payment.amount)}</span>
            <span className="text-stone-700">{CHARGE_KIND_LABEL[payment.kind]}</span>
            <span className="tnum text-stone-500">שולם {payment.paidOn.split('-').reverse().join('.')}</span>
            <span className="text-stone-500">
              {payment.coversMonths > 1
                ? `עבור ${monthLabel(payment.coversFrom)} – ${monthLabel(addMonths(payment.coversFrom, payment.coversMonths - 1))}`
                : `עבור ${monthLabel(payment.coversFrom)}`}
            </span>
            {payment.installmentNo ? (
              <span className="text-stone-500">
                תשלום {payment.installmentNo}/{payment.installmentsTotal}
              </span>
            ) : null}
            {payment.method ? <span className="text-stone-500">{PAYMENT_METHOD_LABEL[payment.method]}</span> : null}
            {payment.note ? <span className="text-stone-500">{payment.note}</span> : null}
            <button
              className="ms-auto text-stone-400 hover:text-red-700 disabled:opacity-50"
              aria-label="מחיקת תשלום"
              disabled={!ready}
              onClick={() => remove(payment.id)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

export default function BillingClient({
  ready,
  month,
  months,
  rows,
  totals,
  defaults,
}: {
  ready: boolean
  month: string
  months: string[]
  rows: SupplierBilling[]
  totals: BillingTotals
  defaults: Defaults
}) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const go = (m: string) => router.push(`/admin/billing?month=${m}`)
  const index = months.indexOf(month)

  const tiles = [
    { label: 'חיוב החודש', value: formatIls(totals.total.owed) },
    { label: 'שולם עבור החודש', value: formatIls(totals.total.paid) },
    { label: 'יתרה לחודש', value: <Balance value={totals.total.balance} strong /> },
    { label: 'התקבל בחודש', value: formatIls(totals.received) },
    { label: 'יתרה מצטברת', value: <Balance value={totals.arrears} strong /> },
    { label: 'שולם מראש', value: formatIls(totals.ahead) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">חיובי ספקים</h1>
          <p className="mt-1 text-base text-stone-600">
            כמה כל ספק חייב על החודש, מנוי ופרסום (מוצר השבוע), וכמה שילם. סכומים לפני מע״מ. הגבייה עצמה נעשית מחוץ לאתר, וכאן רושמים מה נכנס.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white disabled:opacity-40"
            aria-label="החודש הקודם"
            disabled={index <= 0}
            onClick={() => go(months[index - 1])}
          >
            <ChevronRight size={18} />
          </button>
          <select className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-base font-semibold" value={month} onChange={(e) => go(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white disabled:opacity-40"
            aria-label="החודש הבא"
            disabled={index >= months.length - 1}
            onClick={() => go(months[index + 1])}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      {!ready ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-base text-amber-900">
          טבלאות התשלומים עוד לא קיימות במסד הנתונים הזה (מיגרציה 20261109140000). הדוח מראה מה מגיע לפי ברירת המחדל ושבועות הפרסום, אבל אי אפשר לרשום תשלומים עד שהמיגרציה תוחל.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white p-3">
            <p className="tnum text-xl font-bold text-stone-900">{tile.value}</p>
            <p className="text-sm text-stone-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-base">
          <thead className="border-b border-stone-200 bg-stone-50 text-sm text-stone-500">
            <tr>
              <th className="px-3 py-2.5 text-start font-medium">ספק</th>
              <th className="px-3 py-2.5 text-end font-medium">מנוי</th>
              <th className="px-3 py-2.5 text-end font-medium">פרסום</th>
              <th className="px-3 py-2.5 text-end font-medium">יתרה לחודש</th>
              <th className="px-3 py-2.5 text-end font-medium" title="כל מה שהגיע עד סוף החודש, פחות כל מה ששולם עבור החודשים האלה">
                יתרה מצטברת
              </th>
              <th className="px-3 py-2.5 text-end font-medium" title="תשלומים שכבר נכנסו עבור חודשים אחרי החודש הזה">
                שולם מראש
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-500">
                  אין ספקים עם חיוב או תשלום בחודש הזה.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const expanded = open === row.supplier.id
              return (
                <Fragment key={row.supplier.id}>
                  <tr
                    className={`cursor-pointer border-b border-stone-100 align-top hover:bg-stone-50 ${row.supplier.isTest ? 'text-stone-500' : ''}`}
                    onClick={() => setOpen(expanded ? null : row.supplier.id)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <ChevronDown size={16} className={`shrink-0 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        <span className="font-medium text-stone-900">{row.supplier.name}</span>
                      </div>
                      <div className="ms-6 flex flex-wrap gap-1 text-xs">
                        {row.supplier.isTest ? <span className="rounded-full bg-stone-200 px-1.5">ניסיון, לא נספר בסיכום</span> : null}
                        {row.supplier.status !== 'approved' ? <span className="rounded-full bg-stone-200 px-1.5">{row.supplier.status === 'blocked' ? 'חסום' : row.supplier.status === 'pending' ? 'ממתין' : 'נדחה'}</span> : null}
                        {row.plan.monthly === 0 ? <span className="rounded-full bg-stone-100 px-1.5 text-stone-500">ללא מנוי</span> : null}
                        {row.plan.custom ? <span className="rounded-full bg-sky-100 px-1.5 text-sky-800">מנוי ידני</span> : null}
                      </div>
                    </td>
                    <td className="tnum px-3 py-2.5 text-end">
                      <Charge line={row.subscription} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-end">
                      <Charge line={row.promo} extra={row.promo.weeks ? `${row.promo.weeks} שב׳` : undefined} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-end">
                      <Balance value={row.total.balance} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-end">
                      <Balance value={row.arrears} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-end">
                      {row.ahead ? <span className="font-semibold text-emerald-700">{formatIls(row.ahead)}</span> : <span className="text-stone-400">—</span>}
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <td colSpan={6} className="space-y-5 px-4 py-4">
                        {row.received ? (
                          <p className="text-sm text-stone-600">התקבל בחודש הזה (לפי תאריך תשלום): {formatIls(row.received)}</p>
                        ) : null}
                        <PlanForm key={`${row.plan.monthly}-${row.plan.startsMonth}-${row.plan.endsMonth}`} row={row} defaults={defaults} ready={ready} onDone={() => router.refresh()} />
                        <Payments row={row} ready={ready} onDone={() => router.refresh()} />
                        <PaymentForm row={row} month={month} defaults={defaults} ready={ready} onDone={() => router.refresh()} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
          {rows.length ? (
            <tfoot className="border-t-2 border-stone-300 bg-stone-50">
              <tr className="align-top">
                <td className="px-3 py-2.5 font-bold text-stone-900">סה״כ</td>
                <td className="tnum px-3 py-2.5 text-end">
                  <Charge line={totals.subscription} />
                </td>
                <td className="tnum px-3 py-2.5 text-end">
                  <Charge line={totals.promo} extra={totals.promo.weeks ? `${totals.promo.weeks} שב׳` : undefined} />
                </td>
                <td className="tnum px-3 py-2.5 text-end">
                  <Balance value={totals.total.balance} strong />
                </td>
                <td className="tnum px-3 py-2.5 text-end">
                  <Balance value={totals.arrears} strong />
                </td>
                <td className="tnum px-3 py-2.5 text-end font-bold text-emerald-700">{totals.ahead ? formatIls(totals.ahead) : '—'}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <p className="text-sm text-stone-500">
        מנוי: ספק מאושר משלם {formatIls(defaults.monthly)} לחודש מ{monthLabel(defaults.billingStart)} או מחודש האישור, אלא אם נקבע לו אחרת (פותחים את השורה). פרסום: כל שבוע &quot;מוצר השבוע&quot; מאושר, במחיר שנקבע לו, נספר בחודש שבו השבוע מתחיל. תשלום שמכסה כמה חודשים מתחלק ביניהם שווה בשווה.
      </p>
    </div>
  )
}
