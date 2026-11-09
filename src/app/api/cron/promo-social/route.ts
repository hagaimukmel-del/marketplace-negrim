import { NextRequest, NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { runPromoSocial } from '@/lib/promo-social'
import { runPromoCarpenters } from '@/lib/promo-carpenters'

/** Sending the carpentries' mail at the provider's pace takes a few minutes. */
export const maxDuration = 300

/**
 * GET /api/cron/promo-social — this week's "מוצר השבוע" by mail: the social
 * post to the owner, then the week's product to every carpentry that agreed
 * to offers by mail.
 *
 * vercel.json runs it twice on Sunday (04:00 and 05:00 UTC); only the run that
 * falls at 07:00 Israel time sends. `?force=1` sends the owner's mail now (it
 * still needs the cron secret); the carpentries' mail goes once per booking
 * whatever runs it.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const force = request.nextUrl.searchParams.get('force') === '1'
  const now = new Date()
  const result = await runPromoSocial(now, { force })
  const carpenters = await runPromoCarpenters(now, { anyHour: force })
  return NextResponse.json({ ok: true, ...result, carpenters })
}
