import { NextRequest, NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { runWeeklyReport } from '@/lib/weekly-report'

/**
 * GET /api/cron/weekly-report — the operator's weekly signup report.
 *
 * vercel.json runs it twice on Thursday (12:00 and 13:00 UTC); only the run
 * that falls at 15:00 Israel time sends, so daylight saving needs no change.
 * `?force=1` sends it now, for a test; it still needs the cron secret.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const force = request.nextUrl.searchParams.get('force') === '1'
  const result = await runWeeklyReport(new Date(), { force })
  return NextResponse.json({ ok: true, ...result })
}
