import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { OrderUpdate } from '@/lib/db'
import { logAdminAction, refusedForSelfRun, supplierIsOperatorManaged } from '@/lib/admin-scope'

/**
 * The lines of one order, for support.
 *
 * For a self-run supplier, what their customer bought is their business: the
 * orders screen shows the order without its lines, and opening them comes
 * through here so it is written down (owner, 2026-10-08).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data: order } = await getSupabaseAdmin()
    .from('orders')
    .select('id, supplier_id, order_items(id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat)')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })

  if (!(await supplierIsOperatorManaged(order.supplier_id))) {
    await logAdminAction({ action: 'reveal_order_lines', supplierId: order.supplier_id, targetId: id })
  }
  return NextResponse.json({ lines: order.order_items })
}

/** Statuses the operator can move an order to, in fulfilment order. */
const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Only the supplier confirms their own order (owner, 2026-10-08). The
    // operator still runs the suppliers they created.
    const { data: order } = await supabase.from('orders').select('supplier_id').eq('id', id).maybeSingle()
    if (!order) return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })
    if (!(await supplierIsOperatorManaged(order.supplier_id))) return refusedForSelfRun()

    const body = await request.json()
    const update: OrderUpdate = {}

    if (typeof body.status === 'string') {
      if (!(STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
      }
      update.status = body.status
    }

    // Confirming records what the supplier will actually supply and invoice.
    // It is deliberately a separate column from the submitted subtotal: the two
    // differ often, and commission has to be based on the confirmed one.
    if (body.confirmed_subtotal_excl_vat !== undefined && body.confirmed_subtotal_excl_vat !== null) {
      const amount = Number(body.confirmed_subtotal_excl_vat)
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'סכום לא תקין' }, { status: 400 })
      }
      update.confirmed_subtotal_excl_vat = amount
      update.confirmed_at = new Date().toISOString()
    }

    if (typeof body.supplier_note === 'string') {
      update.supplier_note = body.supplier_note.trim() || null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'אין מה לעדכן' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select('id, status, confirmed_subtotal_excl_vat, confirmed_at, supplier_note')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'ההזמנה לא נמצאה' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, order: data })
  } catch (err) {
    console.error('Order update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
