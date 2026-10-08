import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isOperatorManaged } from '@/lib/admin-scope'
import { listThreads } from '@/lib/messages'
import ThreadList from '@/components/messages/ThreadList'

export const dynamic = 'force-dynamic'

/**
 * The supplier's messages with carpentries (T-025). The operator viewing a
 * supplier that runs its own account sees that it has messages, not what they say.
 */
export default async function SupplierMessages() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')
  const privateToAdmin = !isOperatorManaged(supplier.source) && (await isAdmin())
  const { ready, threads } = await listThreads({ side: 'supplier', id: supplier.id })

  return (
    <div className="space-y-3">
      <Link href="/supplier" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600">
        <ChevronRight size={16} /> לממשק
      </Link>
      <h1 className="m-0 text-xl font-bold text-stone-900">הודעות מנגריות</h1>
      {!ready ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">ההודעות יהיו זמינות בקרוב.</p>
      ) : privateToAdmin ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600">
          {threads.length} שיחות, {threads.filter((t) => t.unread).length} מחכות לתשובה. התוכן פרטי לספק.
        </p>
      ) : (
        <ThreadList
          threads={threads}
          hrefBase="/supplier/messages"
          empty="אין עדיין הודעות. שאלות מנגריות והודעות על הזמנות יופיעו כאן."
        />
      )}
    </div>
  )
}
