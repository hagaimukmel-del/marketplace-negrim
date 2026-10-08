import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { listThreads, startThread } from '@/lib/messages'

/** The carpentry's message threads, and a new message to a supplier (about a product or an order). */
export async function GET() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  return NextResponse.json(await listThreads({ side: 'carpenter', id: carpenter.id }))
}

export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  if (!checkRateLimit(`msg:${carpenter.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'שלחת הרבה הודעות בשעה האחרונה. נסה שוב מאוחר יותר.' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const result = await startThread(
    { side: 'carpenter', id: carpenter.id },
    { supplierId: body.supplierId, orderId: body.orderId, productId: body.productId, body: body.body }
  )
  return result.ok
    ? NextResponse.json({ ok: true, threadId: result.threadId }, { status: 201 })
    : NextResponse.json({ error: result.error }, { status: result.status })
}
