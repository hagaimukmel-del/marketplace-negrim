import { NextRequest, NextResponse } from 'next/server'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isOperatorManaged } from '@/lib/admin-scope'
import { openNotification } from '@/lib/notifications'
import { safeSitePath } from '@/lib/notification-links'

/**
 * Open one line from the bell: mark it read, then go to what it is about.
 * The operator looking at a self-run supplier's console does not mark
 * anything read for it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.redirect(new URL('/supplier/join', request.url))
  const { id } = await params
  const markRead = isOperatorManaged(supplier.source) || !(await isAdmin())
  const link = await openNotification({ side: 'supplier', id: supplier.id }, id, markRead)
  return NextResponse.redirect(new URL(safeSitePath(link, '/supplier/notifications'), request.url))
}
