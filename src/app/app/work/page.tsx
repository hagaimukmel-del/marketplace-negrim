import Link from 'next/link'
import { Lock } from 'lucide-react'
import { getWorkViewer, loadBoard } from '@/lib/work-server'
import { unreadConversations } from '@/lib/work-chat-server'
import ComingSoon from './ComingSoon'
import Board from './Board'

export const dynamic = 'force-dynamic'

function nowMs(): number {
  return Date.now()
}

export const metadata = { title: 'נגרים עובדים ביחד — שוק הנגרים' }

/**
 * The work board, or what stands in for it.
 *
 * Until WORK_BOARD_OPEN is set, carpenters see the coming-soon page (and can
 * fill their profile); the operator sees the real board to check it. Once
 * open, the board is for registered carpentries, like המציאון: without a
 * subscription they see the jobs but not who posted them.
 */
export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; type?: string }>
}) {
  const viewer = await getWorkViewer()

  if (!viewer.open && !viewer.admin) {
    return <ComingSoon signedIn={Boolean(viewer.carpenter)} hasProfile={Boolean(viewer.profile)} />
  }

  if (!viewer.carpenter && !viewer.admin) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#8CC9C2] bg-[#E2F0EF] p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">נגרים עובדים ביחד</h1>
        <p className="mt-2 text-muted">לוח עבודות בין נגריות: נגרייה שצריכה עזרה בעבודה מפרסמת, ונגרייה מתאימה מהאזור פונה.</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-[11px] bg-white px-3 py-2 text-sm font-semibold text-ink">
          <Lock size={14} />
          הלוח פתוח לנגריות רשומות
        </p>
        <div className="mt-5">
          <Link href="/join" className="inline-flex h-12 items-center rounded-[11px] bg-brand px-6 font-bold text-navy">
            הרשמה, פחות מדקה
          </Link>
        </div>
      </div>
    )
  }

  const filters = await searchParams
  const [jobs, unread] = await Promise.all([
    loadBoard(viewer, filters),
    viewer.carpenter ? unreadConversations(viewer.carpenter.id) : Promise.resolve(0),
  ])

  return (
    <Board
      jobs={jobs}
      region={filters.region ?? ''}
      type={filters.type ?? ''}
      member={viewer.member}
      signedIn={Boolean(viewer.carpenter)}
      preview={!viewer.open}
      unread={unread}
      now={nowMs()}
    />
  )
}
