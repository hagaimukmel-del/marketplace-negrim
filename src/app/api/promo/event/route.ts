import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { loadCurrentPromo, recordPromoEvent } from '@/lib/promo'

/**
 * Counts a view or an add-to-cart on the "מוצר השבוע" card (T-024).
 *
 * Only for the week running now: an id from any other booking is ignored, so
 * nobody can inflate a past or future week. The carpentry comes from its
 * session when there is one, never from the request.
 */
export async function POST(request: NextRequest) {
  if (!checkRateLimit(`promo:${getClientIP(request)}`, 'promoEvent').allowed) {
    return new NextResponse(null, { status: 204 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const kind = body.kind === 'view' || body.kind === 'add' ? body.kind : null
  const placement = body.placement === 'home' || body.placement === 'category' ? body.placement : null
  if (!kind || !placement || typeof body.week_id !== 'string') {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const [promo, carpenter] = await Promise.all([loadCurrentPromo(), getSessionCarpenter()])
  if (promo?.id === body.week_id) {
    await recordPromoEvent({ weekId: promo.id, kind, placement, carpenterId: carpenter?.id ?? null })
  }
  return new NextResponse(null, { status: 204 })
}
