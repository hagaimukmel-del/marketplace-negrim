import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
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
 */
const TRANSITIONS = {
  confirm: { from: ['pending'], to: 'confirmed' },
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
      .select('supplier_id, line_total_excl_vat')
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

    if (body.action === 'confirm') {
      // Defaults to what was ordered: most confirmations are "yes, all of it",
      // and retyping a number you agree with is how typos reach the figure
      // commission is calculated from.
      const ordered = mine.reduce((sum, line) => sum + Number(line.line_total_excl_vat), 0)
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

    if (body.action === 'confirm') await notifyCarpenterOrderUpdate(body.order_id, 'confirmed')
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
