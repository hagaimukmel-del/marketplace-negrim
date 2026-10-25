import { NextResponse } from 'next/server'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { markAllNotificationsRead } from '@/lib/notifications'

/** POST — mark every notification of the signed-in supplier read. */
export async function POST() {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused
  return (await markAllNotificationsRead({ side: 'supplier', id: supplier.id }))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'לא נשמר' }, { status: 500 })
}
