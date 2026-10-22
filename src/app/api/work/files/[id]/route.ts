import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { fileLink } from '@/lib/work-chat-server'

/**
 * A file from a work conversation, by its message id. Only a side of the
 * conversation gets it, as a link that works for 60 seconds; the bucket is
 * private, so there is no lasting address to pass around.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  const link = await fileLink(carpenter.id, (await params).id)
  if (!link) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 })
  return NextResponse.redirect(link, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
}
