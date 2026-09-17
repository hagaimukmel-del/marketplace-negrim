import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * What a carpentry can say about its own order:
 *   seen     — it looked at a confirmed amount that differs from what it sent
 *   received — the goods arrived. Allowed once the supplier has confirmed; the
 *              step times are set by the database trigger on the status change.
 *
 * Scoped by the session: the order must belong to the signed-in carpentry.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const [{ id }, body] = await Promise.all([params, request.json().catch(() => null)])
  const action = body?.action
  const supabase = getSupabaseAdmin()

  if (action === 'seen') {
    const { data, error } = await supabase
      .from('orders')
      .update({ carpenter_seen_at: new Date().toISOString() })
      .eq('id', id)
      .eq('carpenter_id', carpenter.id)
      .select('id')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'received') {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_by: 'carpenter', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('carpenter_id', carpenter.id)
      .in('status', ['confirmed', 'processing', 'shipped'])
      .select('id')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'אפשר לסמן שהתקבלה רק אחרי שהספק אישר' }, { status: 409 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
}
