import { NextRequest, NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { runPromoSocial } from '@/lib/promo-social'

/**
 * GET /api/cron/promo-social — this week's "מוצר השבוע" social post, by mail.
 *
 * vercel.json runs it twice on Sunday (04:00 and 05:00 UTC); only the run that
 * falls at 07:00 Israel time sends. `?force=1` sends it now; it still needs the
 * cron secret.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const force = request.nextUrl.searchParams.get('force') === '1'
  const result = await runPromoSocial(new Date(), { force })
  return NextResponse.json({ ok: true, ...result })
}
