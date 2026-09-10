import Link from 'next/link'
import { LinkIcon, CheckCircle2, Users } from 'lucide-react'
import { loadConfirmable } from '@/lib/supplier-confirm'
import { formatIls } from '@/lib/vat'
import ConfirmClient from './ConfirmClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'אישור הזמנה — שוק הנגרים',
  // A signed link should never end up in a search index.
  robots: { index: false, follow: false },
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-lg">{children}</div>
    </main>
  )
}

function Notice({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Shell>
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
        {icon}
        <h1 className="mt-3 text-xl font-bold text-stone-900">{title}</h1>
        <p className="mt-2 text-stone-600">{body}</p>
        <Link
          href="/carpenter/catalog"
          className="mt-5 inline-flex h-12 items-center justify-center rounded-lg border border-stone-300 px-5 font-semibold text-stone-700"
        >
          לקטלוג
        </Link>
      </div>
    </Shell>
  )
}

/**
 * The supplier confirms an order without ever having an account.
 *
 * The signature in the URL is the whole credential, resolved on the server
 * before anything renders. It names one order and one supplier, so nothing
 * else is reachable from it and there is no session to steal.
 */
export default async function SupplierConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await loadConfirmable(token)

  if (!result.ok) {
    if (result.reason === 'split') {
      return (
        <Notice
          icon={<Users size={40} className="mx-auto text-stone-400" />}
          title="ההזמנה כוללת כמה ספקים"
          body="הזמנה שמערבת יותר מספק אחד מאושרת מהמערכת ולא מהקישור הזה. נחזור אליכם."
        />
      )
    }
    return (
      <Notice
        icon={<LinkIcon size={40} className="mx-auto text-stone-400" />}
        title="הקישור אינו תקף"
        body="ייתכן שפג תוקפו או שההזמנה כבר טופלה. אם צריך, נשלח קישור חדש."
      />
    )
  }

  const { view } = result

  if (view.status !== 'pending') {
    return (
      <Shell>
        <div className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-700" />
          <h1 className="mt-3 text-xl font-bold text-stone-900">ההזמנה כבר אושרה</h1>
          <p className="mt-2 text-stone-600">
            הזמנה <span className="tnum font-mono text-sm">{view.orderNumber}</span> טופלה
            {view.confirmedTotal != null && (
              <>
                {' '}ואושרה על סך{' '}
                <span className="tnum font-bold">{formatIls(view.confirmedTotal)}</span> ללא מע״מ
              </>
            )}
            .
          </p>
          {view.supplierNote && (
            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
              {view.supplierNote}
            </p>
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <ConfirmClient token={token} view={view} />
    </Shell>
  )
}
