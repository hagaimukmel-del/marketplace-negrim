import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/carpenter/quotes/[id] — the carpentry withdraws a request still
 * waiting for the supplier ("cancel"), or says no to an answered quote
 * ("reject"). Accepting happens by ordering it: /api/orders.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const action = body.action === 'cancel' ? 'cancel' : body.action === 'reject' ? 'reject' : null
  if (!action) return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('quote_requests')
    .update({ status: action === 'cancel' ? 'cancelled' : 'rejected', decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('carpenter_id', carpenter.id)
    .eq('status', action === 'cancel' ? 'requested' : 'quoted')
    .select('id')
  if (error) return NextResponse.json({ error: 'השינוי לא נשמר' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'הבקשה כבר השתנתה. רעננו את הדף.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
