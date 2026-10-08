import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import type { ThreadSummary } from '@/lib/messages'

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * The inbox, the same for a carpentry and a supplier: unread first by weight,
 * newest on top, one row per thread. Rows are full-width tap targets so it
 * works with a thumb on a job site and with a mouse in the office.
 */
export default function ThreadList({ threads, hrefBase, empty }: { threads: ThreadSummary[]; hrefBase: string; empty: string }) {
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">
        <MessageSquare size={28} className="mx-auto mb-2 text-stone-400" />
        {empty}
      </div>
    )
  }
  return (
    <ul className="m-0 list-none overflow-hidden rounded-2xl border border-stone-200 bg-white p-0">
      {threads.map((thread) => (
        <li key={thread.id} className="border-t border-stone-100 first:border-t-0">
          <Link href={`${hrefBase}/${thread.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-stone-50">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${thread.unread ? 'bg-amber-500' : 'bg-transparent'}`}
              aria-label={thread.unread ? 'לא נקרא' : undefined}
            />
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${thread.unread ? 'font-bold text-stone-900' : 'font-semibold text-stone-800'}`}>
                {thread.counterpart}
              </span>
              <span className="block truncate text-sm text-stone-500">
                {thread.subject}
                {thread.status === 'handled' && ' · טופל'}
              </span>
            </span>
            <span className="tnum shrink-0 text-xs text-stone-500">{when(thread.lastMessageAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
