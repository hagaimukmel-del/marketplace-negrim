import Link from 'next/link'
import { Briefcase, Lock } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen, loadJobBoard } from '@/lib/jobs-server'
import JobsComingSoon from '@/components/jobs/JobsComingSoon'
import JobsBoard from '@/components/jobs/JobsBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'דרושים — שוק הנגרים' }

function nowMs(): number {
  return Date.now()
}

/**
 * דרושים: job ads from carpentries and suppliers. Behind registration like
 * המציאון, because the board leads to phone numbers. Suppliers read the same
 * board from /supplier/jobs.
 */
export default async function JobsPage() {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])

  if (!jobsBoardOpen() && !admin) return <JobsComingSoon />

  if (!carpenter && !admin) {
    return (
      <div className="rounded-2xl border border-hair bg-white p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-brand">
          <Briefcase size={28} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">דרושים</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">משרות בנגריות ואצל ספקים: נגרי ייצור, מפעילי CNC, מתקינים, נהגים ומחסנאים. מפרסמים בחינם.</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-[11px] bg-wood-soft px-3 py-2 text-sm font-semibold text-ink">
          <Lock size={14} />
          הלוח פתוח לנגריות ולספקים רשומים
        </p>
        <div className="mt-5">
          <Link href="/join" className="inline-flex h-12 items-center rounded-[11px] bg-brand px-6 font-bold text-navy">
            הרשמה — פחות מדקה
          </Link>
        </div>
      </div>
    )
  }

  const cards = await loadJobBoard({ carpenterId: carpenter?.id })
  return <JobsBoard preview={!jobsBoardOpen()} cards={cards} newHref={carpenter ? '/app/jobs/new' : '/join'} mineHref="/app/jobs/mine" now={nowMs()} />
}
