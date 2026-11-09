import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { runPromoCarpenters, sendPromoCarpentersSample } from '@/lib/promo-carpenters'

/** Sending to the carpentries at the provider's pace takes a few minutes. */
export const maxDuration = 300

/**
 * The operator and the carpentries' "מוצר השבוע" mail, from /admin/promotions:
 * `sample` sends one copy to the owner's inbox; `send` mails this week's
 * product to the carpentries now, for a week set after Sunday's run. A
 * booking reaches each carpentry once, so a second `send` does nothing.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const action = (body as { action?: unknown }).action

  if (action === 'sample') {
    const result = await sendPromoCarpentersSample()
    if (result === 'sent') return NextResponse.json({ ok: true })
    if (result === 'no-promo') return NextResponse.json({ error: 'אין מוצר שבוע מאושר לשבוע הזה' }, { status: 404 })
    return NextResponse.json({ error: 'המייל לא נשלח' }, { status: 502 })
  }

  if (action === 'send') {
    const result = await runPromoCarpenters(new Date(), { anyHour: true })
    if ('sent' in result) return NextResponse.json({ ok: true, queued: result.queued, sent: result.sent })
    const errors: Record<string, string> = {
      'no-promo': 'אין מוצר שבוע מאושר לשבוע הזה',
      'already-sent': 'המייל של השבוע הזה כבר נשלח לנגריות',
      'no-secret': 'חסר ADMIN_SECRET בהגדרות, אי אפשר ליצור קישורי הסרה',
    }
    return NextResponse.json({ error: errors[result.reason] ?? 'המייל לא נשלח' }, { status: result.reason === 'already-sent' ? 409 : 502 })
  }

  return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
}
