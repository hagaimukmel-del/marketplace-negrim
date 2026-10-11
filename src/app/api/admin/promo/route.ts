import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-scope'

/**
 * The operator approves or rejects a "מוצר השבוע" booking (T-024).
 * Body: `{ id, action: 'approve' | 'reject', note? }`. A rejection frees the
 * week for others and shows the note to the supplier. Only a booking that is
 * still waiting can be decided, and an approved one can still be withdrawn.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const action = body.action
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) || null : null
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('promo_weeks')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', note, decided_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', action === 'approve' ? ['requested'] : ['requested', 'approved'])
    .select('id, supplier_id, week_start')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'הבקשה כבר טופלה' }, { status: 409 })

  await logAdminAction({
    action: action === 'approve' ? 'approve_promo_week' : 'reject_promo_week',
    supplierId: data.supplier_id,
    targetId: data.id,
    details: { week_start: data.week_start, note },
  })
  return NextResponse.json({ ok: true })
}
