import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Moderation of the work board: take a job down, put it back (also how a job
 * paused by reports returns), or close a report. Taking a job down or putting
 * it back answers every open report on it.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    if (body.action === 'dismiss_report' && typeof body.report_id === 'string') {
      const { error } = await supabase.from('work_job_reports').update({ resolved_at: now }).eq('id', body.report_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (typeof body.job_id !== 'string') return NextResponse.json({ error: 'חסרה עבודה' }, { status: 400 })

    if (body.action === 'remove') {
      const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : 'manual'
      const { error } = await supabase
        .from('work_jobs')
        .update({ status: 'removed', removed_reason: `admin: ${reason}`, updated_at: now })
        .eq('id', body.job_id)
        .in('status', ['open', 'paused'])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (body.action === 'restore') {
      const { error } = await supabase
        .from('work_jobs')
        .update({ status: 'open', removed_reason: null, updated_at: now })
        .eq('id', body.job_id)
        .in('status', ['removed', 'paused'])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
    }

    await supabase.from('work_job_reports').update({ resolved_at: now }).eq('job_id', body.job_id).is('resolved_at', null)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
