import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import type { OrderUpdate } from '@/lib/db'
import { notifyCarpenterOrderUpdate } from '@/lib/notify-order'

/**
 * A supplier moves an order along: confirm it, send it, mark it delivered.
 *
 * The same narrow rights as the signed link in the order email, from inside the
 * console. A supplier can only act on an order whose every line is theirs —
 * `orders.status` is one field for the whole order, so confirming one that also
 * holds another supplier's lines would speak for a company that never saw it.
 *
 * Each step only moves forward from the state before it, and the update is
 * guarded on that state, so two taps — or a tap from two devices — cannot skip
 * a step or overwrite a confirmation that already happened.
 *
 * Confirming can mark lines the supplier cannot supply (their total comes off
 * the default confirmed amount) and set a delivery date. Rejecting cancels a
 * waiting order and needs a reason, which the carpenter is emailed. Those two
 * extras save after the status moves and are best-effort, so a database
 * without migration 20261008140000 still confirms.
 */
const TRANSITIONS = {
  confirm: { from: ['pending'], to: 'confirmed' },
  reject: { from: ['pending'], to: 'cancelled' },
  // Optional. A supplier who never marks it goes straight to ship or deliver.
  prepare: { from: ['confirmed'], to: 'processing' },
  ship: { from: ['confirmed', 'processing'], to: 'shipped' },
  deliver: { from: ['confirmed', 'processing', 'shipped'], to: 'delivered' },
} as const

type Action = keyof typeof TRANSITIONS

function isAction(value: unknown): value is Action {
  return typeof value === 'string' && value in TRANSITIONS
}

export async function PATCH(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.order_id !== 'string') {
      return NextResponse.json({ error: 'חסרה הזמנה' }, { status: 400 })
    }
    if (!isAction(body.action)) {
      return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: lines } = await supabase
      .from('order_items')
      .select('id, product_name_he, supplier_id, line_total_excl_vat')
      .eq('order_id', body.order_id)

    const allLines = lines ?? []
    const mine = allLines.filter((line) => line.supplier_id === supplier.id)

    if (mine.length === 0) {
      return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })
    }
    if (mine.length !== allLines.length) {
      return NextResponse.json(
        { error: 'ההזמנה כוללת ספקים נוספים ולכן היא מטופלת מהמערכת' },
        { status: 409 }
      )
    }

    const transition = TRANSITIONS[body.action]
    const update: OrderUpdate = {
      status: transition.to,
      updated_at: new Date().toISOString(),
    }

    const unavailable = Array.isArray(body.unavailable_lines)
      ? mine.filter((line) => (body.unavailable_lines as unknown[]).includes(line.id))
      : []
    if (body.action === 'confirm' && unavailable.length === mine.length) {
      return NextResponse.json({ error: 'אם אין אף שורה לספק, דחו את ההזמנה עם סיבה' }, { status: 400 })
    }

    let deliveryOn: string | null = null
    if (body.action === 'confirm' && body.expected_delivery_on) {
      const raw = String(body.expected_delivery_on)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
        return NextResponse.json({ error: 'תאריך אספקה לא תקין' }, { status: 400 })
      }
      deliveryOn = raw
    }

    if (body.action === 'reject') {
      const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
      if (reason.length < 2) {
        return NextResponse.json({ error: 'צריך לכתוב לנגר למה ההזמנה נדחתה' }, { status: 400 })
      }
      update.supplier_note = reason.slice(0, 600)
    }

    if (body.action === 'confirm') {
      // Defaults to what was ordered, less any line marked unavailable: most
      // confirmations are "yes, all of it", and retyping a number you agree
      // with is how typos reach the confirmed amount.
      const ordered = mine
        .filter((line) => !unavailable.includes(line))
        .reduce((sum, line) => sum + Number(line.line_total_excl_vat), 0)
      const raw = body.confirmed_subtotal_excl_vat
      const amount = raw === undefined || raw === null || raw === '' ? ordered : Number(raw)
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'סכום לא תקין' }, { status: 400 })
      }
      update.confirmed_subtotal_excl_vat = Number(amount.toFixed(2))
      update.confirmed_at = new Date().toISOString()

      const note = typeof body.supplier_note === 'string' ? body.supplier_note.trim() : ''
      update.supplier_note = note ? note.slice(0, 600) : null
    }

    const { data: moved, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', body.order_id)
      .in('status', [...transition.from])
      .select('id, status')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!moved) {
      return NextResponse.json(
        { error: 'מצב ההזמנה כבר השתנה — רענן את הדף' },
        { status: 409 }
      )
    }

    if (body.action === 'confirm' && (unavailable.length > 0 || deliveryOn)) {
      const [items, order] = await Promise.all([
        unavailable.length
          ? supabase.from('order_items').update({ unavailable: true }).in('id', unavailable.map((line) => line.id))
          : Promise.resolve({ error: null }),
        deliveryOn
          ? supabase.from('orders').update({ expected_delivery_on: deliveryOn }).eq('id', body.order_id)
          : Promise.resolve({ error: null }),
      ])
      if (items.error || order.error) console.error('Order confirmation extras not saved:', items.error ?? order.error)
    }

    if (body.action === 'confirm') {
      await notifyCarpenterOrderUpdate(body.order_id, 'confirmed', {
        deliveryOn,
        missing: unavailable.map((line) => line.product_name_he),
      })
    }
    if (body.action === 'reject') await notifyCarpenterOrderUpdate(body.order_id, 'rejected')
    if (body.action === 'ship') await notifyCarpenterOrderUpdate(body.order_id, 'shipped')

    return NextResponse.json({ ok: true, status: moved.status })
  } catch (err) {
    console.error('Supplier order update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
