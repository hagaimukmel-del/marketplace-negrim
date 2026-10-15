import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getWorkViewer } from '@/lib/work-server'
import { REPORTS_TO_PAUSE, isReportReason } from '@/lib/work'

/**
 * Flag a job for the operator. One open report per carpentry per job, and
 * REPORTS_TO_PAUSE from different carpentries take it off the board until
 * the operator looks: the board must not depend on someone checking daily.
 */
export async function POST(request: NextRequest) {
  const viewer = await getWorkViewer()
  const carpenter = viewer.carpenter
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  if (!viewer.open) return NextResponse.json({ error: 'הלוח עוד לא נפתח' }, { status: 403 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.job_id !== 'string') return NextResponse.json({ error: 'חסרה עבודה' }, { status: 400 })
    if (!isReportReason(body.reason)) return NextResponse.json({ error: 'צריך לבחור סיבה' }, { status: 400 })
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null

    const supabase = getSupabaseAdmin()
    const { data: job } = await supabase
      .from('work_jobs')
      .select('id, carpenter_id, status')
      .eq('id', body.job_id)
      .maybeSingle()
    if (!job) return NextResponse.json({ error: 'העבודה לא נמצאה' }, { status: 404 })
    if (job.carpenter_id === carpenter.id) {
      return NextResponse.json({ error: 'אי אפשר לדווח על עבודה שלכם' }, { status: 400 })
    }

    const { data: mine } = await supabase
      .from('work_job_reports')
      .select('id')
      .eq('job_id', job.id)
      .eq('reporter_id', carpenter.id)
      .is('resolved_at', null)
      .limit(1)
    if (mine && mine.length > 0) return NextResponse.json({ ok: true, already: true })

    const { error } = await supabase.from('work_job_reports').insert({
      job_id: job.id,
      reporter_id: carpenter.id,
      reason: body.reason,
      note,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: open } = await supabase
      .from('work_job_reports')
      .select('reporter_id')
      .eq('job_id', job.id)
      .is('resolved_at', null)
    const reporters = new Set((open ?? []).map((row) => row.reporter_id).filter(Boolean))
    let paused = false
    if (reporters.size >= REPORTS_TO_PAUSE && job.status === 'open') {
      await supabase
        .from('work_jobs')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'open')
      paused = true
    }

    return NextResponse.json({ ok: true, paused }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הדיווח נכשל' }, { status: 500 })
  }
}
