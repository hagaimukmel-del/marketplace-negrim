import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { loadThread, reply, setHandled } from '@/lib/messages'

type Params = { params: Promise<{ id: string }> }

/** One thread of the signed-in carpentry: read (marks it read), reply, or mark handled. */
export async function GET(_request: NextRequest, { params }: Params) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const thread = await loadThread({ side: 'carpenter', id: carpenter.id }, (await params).id)
  return thread ? NextResponse.json({ thread }) : NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 })
}

export async function POST(request: NextRequest, { params }: Params) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  if (!checkRateLimit(`msg:${carpenter.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'שלחת הרבה הודעות בשעה האחרונה. נסה שוב מאוחר יותר.' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const result = await reply({ side: 'carpenter', id: carpenter.id }, (await params).id, body.body)
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const ok = await setHandled({ side: 'carpenter', id: carpenter.id }, (await params).id, body.handled === true)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 })
}
