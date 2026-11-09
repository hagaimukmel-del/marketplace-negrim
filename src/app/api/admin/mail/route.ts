import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { checkDraft, type MailAudience, type MailSide } from '@/lib/admin-mail-rules'
import { loadAudience, sendAdminMailToOne, sendAdminMailing } from '@/lib/admin-mail'

/** A mailing sends at the provider's pace inside the request. */
export const maxDuration = 300

const UUID = /^[0-9a-f-]{36}$/i

function isSide(value: unknown): value is MailSide {
  return value === 'supplier' || value === 'carpenter'
}

function isAudience(value: unknown): value is MailAudience {
  return value === 'suppliers' || value === 'carpenters'
}

/** How many a mailing to this audience would reach, for the confirmation step. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const audience = request.nextUrl.searchParams.get('audience')
  if (!isAudience(audience)) return NextResponse.json({ error: 'רשימה לא מוכרת' }, { status: 400 })
  const recipients = await loadAudience(audience)
  return NextResponse.json({ count: recipients.length })
}

/**
 * Send a hand-written mail.
 * { to: { side, id }, subject, body }: one supplier or carpentry.
 * { audience, subject, body, marketing }: every approved supplier, or every carpentry that agreed to offers.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!input) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })

  const checked = checkDraft(input)
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

  const to = input.to as { side?: unknown; id?: unknown } | undefined
  if (to) {
    if (!isSide(to.side) || typeof to.id !== 'string' || !UUID.test(to.id)) {
      return NextResponse.json({ error: 'נמען לא תקין' }, { status: 400 })
    }
    const result = await sendAdminMailToOne(to.side, to.id, checked.draft)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, to: result.to })
  }

  if (!isAudience(input.audience)) return NextResponse.json({ error: 'רשימה לא מוכרת' }, { status: 400 })
  const result = await sendAdminMailing(input.audience, checked.draft, input.marketing === true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}
