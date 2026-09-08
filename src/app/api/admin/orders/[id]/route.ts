import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { OrderUpdate } from '@/lib/db'

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

    const { data, error } = await getSupabaseAdmin()
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
