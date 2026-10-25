import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isOperatorManaged } from '@/lib/admin-scope'
import { listNotifications } from '@/lib/notifications'
import NotificationList from '@/components/notifications/NotificationList'
import MarkAllRead from '@/components/notifications/MarkAllRead'

export const dynamic = 'force-dynamic'

/**
 * The supplier's bell: new orders, quote requests, questions and messages.
 * The operator viewing a self-run supplier sees how many, not what.
 */
export default async function SupplierNotifications() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  const privateToAdmin = !isOperatorManaged(supplier.source) && (await isAdmin())
  const { ready, items } = await listNotifications({ side: 'supplier', id: supplier.id })

  return (
    <div className="space-y-3">
      <Link href="/supplier" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600">
        <ChevronRight size={16} /> לממשק
      </Link>
      <header className="flex items-center gap-2">
        <h1 className="m-0 flex-1 text-xl font-bold text-stone-900">התראות</h1>
        {!privateToAdmin && items.some((item) => !item.read) && <MarkAllRead apiPath="/api/supplier/notifications" />}
      </header>
      {!ready ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">ההתראות יהיו זמינות בקרוב.</p>
      ) : privateToAdmin ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">
          {items.length} התראות, {items.filter((item) => !item.read).length} שלא נקראו. התוכן פרטי לספק.
        </p>
      ) : (
        <NotificationList items={items} openBase="/supplier/notifications" />
      )}
    </div>
  )
}
