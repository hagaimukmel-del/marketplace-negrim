import { NextRequest, NextResponse, after } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getWorkViewer } from '@/lib/work-server'
import { loadConversation, sendMessage, setBlocked, sharePhone } from '@/lib/work-chat-server'
import { notifyConversation } from '@/lib/work-notify-server'

type Params = { params: Promise<{ id: string }> }

/** One conversation of the signed-in carpentry: read it (marks it read), write in it, or block, unblock and share a phone. */
export async function GET(_request: NextRequest, { params }: Params) {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  const conversation = await loadConversation(viewer, (await params).id)
  return conversation ? NextResponse.json({ conversation }) : NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 })
}

/** A message: multipart with `body` and at most one `file` (a photo or a PDF). */
export async function POST(request: NextRequest, { params }: Params) {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  if (!checkRateLimit(`msg:${viewer.carpenter.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'שלחתם הרבה הודעות בשעה האחרונה. נסו שוב מאוחר יותר.' }, { status: 429 })
  }
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  const files = form.getAll('file').filter((entry) => entry instanceof File && entry.size > 0)
  if (files.length > 1) return NextResponse.json({ error: 'קובץ אחד בכל הודעה' }, { status: 400 })

  const { id } = await params
  const result = await sendMessage(viewer, id, form.get('body'), files[0] ?? null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  after(() => notifyConversation(id, result.side).catch((err) => console.error('Work message email failed:', err)))
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  let result
  switch (body.action) {
    case 'block':
    case 'unblock':
      result = await setBlocked(viewer.carpenter.id, id, body.action === 'block')
      break
    case 'share_phone':
      result = await sharePhone(viewer, id)
      break
    default:
      return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
  }
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status })
}
