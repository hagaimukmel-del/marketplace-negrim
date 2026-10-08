import { NextRequest, NextResponse } from 'next/server'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { isOperatorManaged, refuseAdminWriteFor, refusedForSelfRun } from '@/lib/admin-scope'
import { checkRateLimit } from '@/lib/rate-limit'
import { loadThread, reply, setHandled } from '@/lib/messages'

type Params = { params: Promise<{ id: string }> }

/** One thread of the signed-in supplier: read (marks it read), reply, or mark handled. */
export async function GET(_request: NextRequest, { params }: Params) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  if (!isOperatorManaged(supplier.source) && (await isAdmin())) return refusedForSelfRun()
  const thread = await loadThread({ side: 'supplier', id: supplier.id }, (await params).id)
  return thread ? NextResponse.json({ thread }) : NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 })
}

export async function POST(request: NextRequest, { params }: Params) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused
  if (!checkRateLimit(`msg:${supplier.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'נשלחו הרבה הודעות בשעה האחרונה. נסו שוב מאוחר יותר.' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const result = await reply({ side: 'supplier', id: supplier.id }, (await params).id, body.body)
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const ok = await setHandled({ side: 'supplier', id: supplier.id }, (await params).id, body.handled === true)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 })
}
