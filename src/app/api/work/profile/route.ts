import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { readProfileFields } from '@/lib/work'

/**
 * Save the capabilities profile, and with it join the service.
 *
 * Filling the profile is how a carpentry joins during the free launch: the
 * first save gives it a "founding" subscription. On conflict nothing happens,
 * so a later save never turns a paid or cancelled row back into founding.
 * Open before the board is, so the launch can wait for 30 profiles.
 */
export async function PUT(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    const fields = readProfileFields(body)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('work_profiles')
      .upsert({ carpenter_id: carpenter.id, ...fields, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { error: joinError } = await supabase
      .from('work_subscriptions')
      .upsert({ carpenter_id: carpenter.id, status: 'founding' }, { onConflict: 'carpenter_id', ignoreDuplicates: true })
    if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Work profile save failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'השמירה נכשלה' }, { status: 500 })
  }
}

/**
 * Leave the service. Nothing the carpentry wrote is deleted: its open jobs
 * come off the board (removed by the owner, so the admin's outcome counts
 * stay honest), the emails stop, and the founding row goes, so saving the
 * profile again is joining again. The profile and the conversations stay. A
 * paid term is not ended from here: it has a refund to settle, so it goes
 * through us.
 */
export async function DELETE() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })

  try {
    const supabase = getSupabaseAdmin()
    const { data: subscription, error: readError } = await supabase
      .from('work_subscriptions')
      .select('status')
      .eq('carpenter_id', carpenter.id)
      .maybeSingle()
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
    if (subscription?.status === 'active') {
      return NextResponse.json({ error: 'יש לכם מנוי בתשלום. כדי לצאת ממנו כתבו לנו: nagarim.b2b@gmail.com' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const { error: jobsError } = await supabase
      .from('work_jobs')
      .update({ status: 'removed', removed_reason: 'owner: left the service', updated_at: now })
      .eq('carpenter_id', carpenter.id)
      .in('status', ['open', 'paused'])
    if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 })

    const { error: profileError } = await supabase
      .from('work_profiles')
      .update({ notify_email: false, updated_at: now })
      .eq('carpenter_id', carpenter.id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    const { error: leaveError } = await supabase
      .from('work_subscriptions')
      .delete()
      .eq('carpenter_id', carpenter.id)
      .eq('status', 'founding')
    if (leaveError) return NextResponse.json({ error: leaveError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Work leave failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'היציאה נכשלה' }, { status: 500 })
  }
}
