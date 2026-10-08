import { NextRequest, NextResponse } from 'next/server'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isOperatorManaged, refuseAdminWriteFor, refusedForSelfRun } from '@/lib/admin-scope'
import { checkRateLimit } from '@/lib/rate-limit'
import { listThreads, startThread } from '@/lib/messages'

/**
 * The supplier's message threads, and a message to a carpentry about an order.
 * The operator viewing a self-run supplier's console does not read its messages.
 */
export async function GET() {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  if (!isOperatorManaged(supplier.source) && (await isAdmin())) return refusedForSelfRun()
  return NextResponse.json(await listThreads({ side: 'supplier', id: supplier.id }))
}

export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused
  if (!checkRateLimit(`msg:${supplier.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'נשלחו הרבה הודעות בשעה האחרונה. נסו שוב מאוחר יותר.' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const result = await startThread({ side: 'supplier', id: supplier.id }, { orderId: body.orderId, body: body.body })
  return result.ok
    ? NextResponse.json({ ok: true, threadId: result.threadId }, { status: 201 })
    : NextResponse.json({ error: result.error }, { status: result.status })
}
