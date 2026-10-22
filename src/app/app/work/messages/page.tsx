import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { getWorkViewer } from '@/lib/work-server'
import { listConversations } from '@/lib/work-chat-server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'שיחות — נגרים עובדים ביחד' }

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
 * The carpentry's conversations about jobs: the ones it answered and the
 * answers to its own jobs, in one list, unread first by weight. Readable
 * after a term ends; writing is what needs a live one.
 */
export default async function WorkMessagesPage() {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter || (!viewer.open && !viewer.admin)) redirect('/app/work')

  const { conversations } = await listConversations(viewer.carpenter.id)

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
      <Link href="/app/work" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowRight size={16} />
        ללוח העבודות
      </Link>
      <h1 className="text-xl font-extrabold text-ink">שיחות על עבודות</h1>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-hair bg-white p-8 text-center text-muted">
          <MessageSquare size={28} className="mx-auto mb-2 text-[#8CC9C2]" />
          עוד אין שיחות. כשתפנו לעבודה, או כשנגרייה תפנה לעבודה שפרסמתם, השיחה תופיע כאן.
        </div>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-2xl border border-hair bg-white p-0">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="border-t border-hair first:border-t-0">
              <Link href={`/app/work/messages/${conversation.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${conversation.unread ? 'bg-[#0E5E5E]' : 'bg-transparent'}`}
                  aria-label={conversation.unread ? 'לא נקרא' : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${conversation.unread ? 'font-bold text-ink' : 'font-semibold text-stone-800'}`}>
                    {conversation.counterpart}
                    {conversation.counterpartCity && <span className="font-normal text-muted"> · {conversation.counterpartCity}</span>}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {conversation.side === 'poster' ? 'פנתה לעבודה שלכם: ' : 'פניתם לעבודה: '}
                    {conversation.subject}
                  </span>
                </span>
                <span className="tnum shrink-0 text-xs text-muted">{when(conversation.lastMessageAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
