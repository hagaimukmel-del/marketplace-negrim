import { NextRequest, NextResponse, after } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getWorkViewer } from '@/lib/work-server'
import { listConversations, startConversation } from '@/lib/work-chat-server'
import { notifyConversation } from '@/lib/work-notify-server'

/** The carpentry's work conversations, and "אני מעוניין" on a job (opens one with a first message). */
export async function GET() {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  return NextResponse.json(await listConversations(viewer.carpenter.id))
}

export async function POST(request: NextRequest) {
  const viewer = await getWorkViewer()
  if (!viewer.carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  if (!checkRateLimit(`msg:${viewer.carpenter.id}`, 'message').allowed) {
    return NextResponse.json({ error: 'שלחתם הרבה הודעות בשעה האחרונה. נסו שוב מאוחר יותר.' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const result = await startConversation(viewer, body.job_id, body.body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  after(() => notifyConversation(result.id, 'applicant').catch((err) => console.error('Work answer email failed:', err)))
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 })
}
