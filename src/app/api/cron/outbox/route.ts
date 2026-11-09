import { NextRequest, NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { processOutbox, purgeOldOutbox } from '@/lib/outbox'
import { runReminders, sendDailySummaries } from '@/lib/reminders'
import { purgeExpiredCarpenters } from '@/lib/carpenter-deletion-server'
import { purgeExpiredLoginCodes } from '@/lib/login-code'

/**
 * GET /api/cron/outbox — the scheduled run of the email outbox (vercel.json).
 *
 * Vercel calls it with `Authorization: Bearer $CRON_SECRET`. Without the
 * secret configured it refuses everyone: an open endpoint that sends mail is
 * an invitation. The outbox also runs after every queued mail and while people
 * use the site; this run is the safety net for quiet hours.
 *
 * The same run climbs the reminder ladder and queues the suppliers' morning
 * summary (step 5) before draining the outbox, so they go out in this call.
 *
 * It also removes for good the carpentries the operator deleted more than
 * three months ago (lib/carpenter-deletion.ts), and login codes that expired
 * more than a day ago, and copies of mails older than a year.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const purgedCarpenters = await purgeExpiredCarpenters()
  const purgedLoginCodes = await purgeExpiredLoginCodes()
  const purgedMails = await purgeOldOutbox()
  const reminders = await runReminders()
  const summaries = await sendDailySummaries()

  // A few runs, so a backlog after an outage drains in one call.
  const totals = { claimed: 0, sent: 0, failed: 0 }
  for (let run = 0; run < 5; run += 1) {
    const result = await processOutbox()
    totals.claimed += result.claimed
    totals.sent += result.sent
    totals.failed += result.failed
    if (result.claimed === 0) break
  }
  return NextResponse.json({ ok: true, ...totals, reminders, summaries, purgedCarpenters, purgedLoginCodes, purgedMails })
}
