import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { runWeeklyReport } from '@/lib/weekly-report'

/**
 * POST /api/admin/weekly-report — send the weekly signup report now, from the
 * reports screen. Same mail as Thursday's, covering the last seven days; it
 * does not use up Thursday's run.
 */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runWeeklyReport(new Date(), { force: true })
  if (!result.sent) return NextResponse.json({ error: 'הדוח לא נשלח. בדקו את הגדרות המייל.' }, { status: 502 })
  return NextResponse.json({ ok: true, counts: result.counts })
}
