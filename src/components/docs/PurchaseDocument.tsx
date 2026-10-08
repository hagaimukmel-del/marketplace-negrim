import { money, termsText } from '@/lib/app/format'
import Logo from '@/components/brand/Logo'
import { round2, vatAmount, VAT_RATE } from '@/lib/vat'

export interface DocLine {
  name: string
  /** "2 × דלי 10 ק״ג" or "20 ק״ג". */
  quantity: string
  unitPrice: number
  unit: string
  lineTotal: number
}

export interface DocParty {
  name: string
  lines: string[]
}

export interface PurchaseDocumentProps {
  kind: 'quote' | 'order'
  /** "#1048" for an order; none for a quote. */
  number?: string
  date: string
  status?: string
  supplier: { name: string; logoUrl?: string | null; phone?: string | null; terms: string[]; leadDays: number | null }
  buyer: DocParty
  lines: DocLine[]
  /** The supplier's confirmed amount, when it differs from the sum of the lines. */
  confirmedTotal?: number | null
  note?: string | null
}

/**
 * A price quote or a purchase order for one supplier, laid out to print or save
 * as PDF. Deliberately not an invoice (CLAUDE.md §5): it says what it is, gives
 * prices excl. VAT with VAT as an indication, and says the supplier invoices.
 *
 * The supplier's logo sits on the right and the platform's on the left (owner,
 * 2026-10-08): the document is the supplier's order, sent through the platform.
 */
export default function PurchaseDocument(props: PurchaseDocumentProps) {
  const { kind, supplier, buyer, lines } = props
  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0))
  const basis = props.confirmedTotal ?? subtotal
  const title = kind === 'quote' ? 'הצעת מחיר' : 'הזמנת רכש'

  return (
    <article className="doc-page mx-auto w-full max-w-[800px] break-after-page bg-white p-5 text-[13px] leading-relaxed text-stone-900 sm:p-8 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 pb-3">
        {supplier.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={supplier.logoUrl} alt={supplier.name} className="h-14 max-w-[180px] object-contain" />
        ) : (
          <b className="text-lg">{supplier.name}</b>
        )}
        <div className="flex flex-col items-end gap-0.5 text-xs text-stone-600">
          <Logo size="sm" tagline="always" />
          <span dir="ltr">nagarimb2b.com</span>
        </div>
      </div>
      <header className="border-b-2 border-stone-900 pb-3">
        <h1 className="m-0 text-2xl font-extrabold">
          {title} {props.number && <span className="tnum">{props.number}</span>}
        </h1>
        <div className="text-stone-600">
          {props.date}
          {props.status && <> · {props.status}</>}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
        <div className="rounded-lg border border-stone-300 p-3">
          <div className="text-xs font-bold text-stone-500">ספק</div>
          <b className="block">{supplier.name}</b>
          {supplier.phone && <div className="tnum">{supplier.phone}</div>}
          <div>תנאי תשלום: {termsText(supplier.terms)}</div>
          {supplier.leadDays != null && <div>זמן אספקה: עד {supplier.leadDays} ימי עסקים</div>}
        </div>
        <div className="rounded-lg border border-stone-300 p-3">
          <div className="text-xs font-bold text-stone-500">{kind === 'quote' ? 'עבור' : 'מזמין'}</div>
          <b className="block">{buyer.name}</b>
          {buyer.lines.filter(Boolean).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </section>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="border-b border-stone-400 text-xs text-stone-600">
              <th className="py-1.5 pe-2 text-start font-bold">מוצר</th>
              <th className="py-1.5 pe-2 text-start font-bold">כמות</th>
              <th className="py-1.5 pe-2 text-start font-bold">מחיר ליחידה</th>
              <th className="py-1.5 text-end font-bold">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-stone-200 align-top">
                <td className="py-1.5 pe-2 font-semibold">{line.name}</td>
                <td className="tnum py-1.5 pe-2 whitespace-nowrap">{line.quantity}</td>
                <td className="tnum py-1.5 pe-2 whitespace-nowrap">
                  {money(line.unitPrice)} ל{line.unit}
                </td>
                <td className="tnum py-1.5 text-end whitespace-nowrap">{money(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-3 ms-auto w-full max-w-[300px] text-sm">
        <Row label="סה״כ לפני מע״מ" value={money(subtotal)} strong={props.confirmedTotal == null} />
        {props.confirmedTotal != null && props.confirmedTotal !== subtotal && (
          <Row label="סכום שאישר הספק, לפני מע״מ" value={money(props.confirmedTotal)} strong />
        )}
        <Row label={`מע״מ ${Math.round(VAT_RATE * 100)}% (להערכה)`} value={money(vatAmount(basis))} />
        <Row label="סה״כ כולל מע״מ (להערכה)" value={money(round2(basis + vatAmount(basis)))} />
      </section>

      {props.note && (
        <p className="mt-3 rounded-lg bg-stone-100 p-2.5">
          <b>הערה: </b>
          {props.note}
        </p>
      )}

      <footer className="mt-6 border-t border-stone-300 pt-3 text-xs text-stone-600">
        {kind === 'quote'
          ? 'הצעת מחיר לפי המחירון של הספק באתר ביום ההפקה. המחיר הסופי, הזמינות וזמן האספקה נקבעים כשהספק מאשר את הזמנת הרכש.'
          : 'הזמנת רכש שנשלחה לספק דרך שוק הנגרים. הספק מאשר, מספק ומוציא את החשבונית ישירות לנגרייה.'}{' '}
        המסמך אינו חשבונית מס ואינו קבלה.
      </footer>
    </article>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-0.5 ${strong ? 'font-extrabold' : 'text-stone-700'}`}>
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  )
}
