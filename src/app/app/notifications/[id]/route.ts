import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { openNotification } from '@/lib/notifications'
import { safeSitePath } from '@/lib/notification-links'

/** Open one line from the bell: mark it read, then go to what it is about. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  const { id } = await params
  const link = carpenter ? await openNotification({ side: 'carpenter', id: carpenter.id }, id) : null
  return NextResponse.redirect(new URL(safeSitePath(link, '/app/notifications'), request.url))
}
