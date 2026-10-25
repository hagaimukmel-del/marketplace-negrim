import { NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { markAllNotificationsRead } from '@/lib/notifications'

/** POST — mark every notification of the signed-in carpentry read. */
export async function POST() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  return (await markAllNotificationsRead({ side: 'carpenter', id: carpenter.id }))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'לא נשמר' }, { status: 500 })
}
