import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadThread } from '@/lib/messages'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import ThreadView from '@/components/messages/ThreadView'

export const dynamic = 'force-dynamic'

export default async function AppThread({ params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="השיחה" />
  const thread = await loadThread({ side: 'carpenter', id: carpenter.id }, (await params).id)
  if (!thread) notFound()
  return (
    <div className="space-y-2 pt-3">
      <Link href="/app/messages" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600">
        <ChevronRight size={16} /> כל ההודעות
      </Link>
      {thread.orderId && (
        <Link href={`/app/orders/${thread.orderId}`} className="block text-sm font-semibold text-emerald-800">
          להזמנה {thread.orderLabel}
        </Link>
      )}
      <ThreadView thread={thread} apiBase="/api/app/messages" />
    </div>
  )
}
