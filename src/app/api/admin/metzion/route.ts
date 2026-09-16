import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Moderation: take a listing down, put it back, or close a report.
 *
 * Taking a listing down is a status, not a delete, like everything else on the
 * board — and taking it down closes every open report on it, since they have
 * all been answered.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    if (body.action === 'dismiss_report' && typeof body.report_id === 'string') {
      const { error } = await supabase
        .from('metzion_reports')
        .update({ resolved_at: now })
        .eq('id', body.report_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (typeof body.listing_id !== 'string') {
      return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })
    }

    if (body.action === 'remove') {
      const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : 'admin'
      const { error } = await supabase
        .from('metzion_listings')
        .update({ status: 'removed', removed_reason: `admin: ${reason}`, updated_at: now })
        .eq('id', body.listing_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await supabase
        .from('metzion_reports')
        .update({ resolved_at: now })
        .eq('listing_id', body.listing_id)
        .is('resolved_at', null)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'restore') {
      const { error } = await supabase
        .from('metzion_listings')
        .update({ status: 'active', removed_reason: null, updated_at: now })
        .eq('id', body.listing_id)
        .eq('status', 'removed')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
