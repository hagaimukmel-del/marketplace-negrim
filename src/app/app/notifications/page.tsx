import { Bell } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { listNotifications } from '@/lib/notifications'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import { PageHeader } from '@/components/app/ui'
import NotificationList from '@/components/notifications/NotificationList'
import MarkAllRead from '@/components/notifications/MarkAllRead'

export const dynamic = 'force-dynamic'

/** The carpentry's bell: quotes answered, orders confirmed, messages from suppliers. */
export default async function AppNotifications() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter)
    return (
      <>
        <PageHeader icon={Bell} title="התראות" />
        <SignedOutNotice what="ההתראות" next="/app/notifications" />
      </>
    )
  const { ready, items } = await listNotifications({ side: 'carpenter', id: carpenter.id })
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Bell}
        title="התראות"
        subtitle="הצעות מחיר, אישורי הזמנות והודעות מהספקים"
        actions={items.some((item) => !item.read) ? <MarkAllRead apiPath="/api/app/notifications" /> : undefined}
      />
      {ready ? (
        <NotificationList items={items} openBase="/app/notifications" />
      ) : (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">ההתראות יהיו זמינות בקרוב.</p>
      )}
    </div>
  )
}
