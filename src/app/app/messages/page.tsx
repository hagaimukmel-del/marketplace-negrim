import { MessageSquare } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { listThreads } from '@/lib/messages'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import { PageHeader } from '@/components/app/ui'
import ThreadList from '@/components/messages/ThreadList'

export const dynamic = 'force-dynamic'

/** The carpentry's messages with suppliers (T-025). */
export default async function AppMessages() {
  const carpenter = await getSessionCarpenter()
  const header = <PageHeader icon={MessageSquare} title="הודעות" subtitle="שיחות עם הספקים" />
  if (!carpenter)
    return (
      <>
        {header}
        <SignedOutNotice what="ההודעות" next="/app/messages" />
      </>
    )
  const { ready, threads } = await listThreads({ side: 'carpenter', id: carpenter.id })
  return (
    <div className="space-y-4">
      {header}
      {ready ? (
        <ThreadList
          threads={threads}
          hrefBase="/app/messages"
          empty="אין עדיין הודעות. אפשר לכתוב לספק מדף המוצר או מתוך הזמנה."
        />
      ) : (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">ההודעות יהיו זמינות בקרוב.</p>
      )}
    </div>
  )
}
