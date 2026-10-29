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
 * subscription they see the jobs but not who posted them, and a visitor who
 * has not signed up sees what the service is and how to join.
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
    return <ComingSoon open signedIn={false} hasProfile={false} />
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
