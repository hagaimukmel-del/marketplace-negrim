import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getWorkViewer } from '@/lib/work-server'
import { loadConversation } from '@/lib/work-chat-server'
import Conversation from './Conversation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'שיחה — נגרים עובדים ביחד' }

export default async function WorkConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter || (!viewer.open && !viewer.admin)) redirect('/app/work')

  const conversation = await loadConversation(viewer, (await params).id)
  if (!conversation) notFound()

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted">
        <Link href="/app/work/messages" className="flex items-center gap-1">
          <ArrowRight size={16} />
          כל השיחות
        </Link>
        <Link href={`/app/work/${conversation.jobId}`} className="ms-auto text-[#0B5A5A] underline">
          לפרטי העבודה
        </Link>
      </div>
      <Conversation conversation={conversation} canSharePhone={Boolean(viewer.carpenter.phone)} />
    </div>
  )
}
