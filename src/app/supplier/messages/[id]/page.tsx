import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdminLookingAtSupplier, isOperatorManaged } from '@/lib/admin-scope'
import { loadThread } from '@/lib/messages'
import ThreadView from '@/components/messages/ThreadView'

export const dynamic = 'force-dynamic'

export default async function SupplierThread({ params }: { params: Promise<{ id: string }> }) {
  const supplier = await getSessionSupplier()
  const { id } = await params
  if (!supplier) redirect(`/supplier/join?next=${encodeURIComponent(`/supplier/messages/${id}`)}`)
  // Opening a thread marks it read, so the operator must not open a self-run supplier's.
  if (!isOperatorManaged(supplier.source) && (await isAdminLookingAtSupplier())) redirect('/supplier/messages')
  const thread = await loadThread({ side: 'supplier', id: supplier.id }, id)
  if (!thread) notFound()
  return (
    <div className="space-y-2">
      <Link href="/supplier/messages" className="inline-flex items-center gap-1 text-base font-semibold text-stone-600">
        <ChevronRight size={16} /> כל ההודעות
      </Link>
      <ThreadView thread={thread} apiBase="/api/supplier/messages" composerClass="bottom-3" />
    </div>
  )
}
