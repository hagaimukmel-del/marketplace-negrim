import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadConfirmable } from '@/lib/supplier-confirm'

/**
 * A supplier confirms an order from the link in their email.
 *
 * The token is the whole credential, and it is re-resolved here rather than
 * trusted from the page: the browser could post any order id it liked, so the
 * order being acted on is whichever one the signature names.
 *
 * What a supplier may set is deliberately narrow — the amount they will
 * actually supply, and a note. They cannot move an order to any other status,
 * cancel it, or touch anything else.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''

    const result = await loadConfirmable(token)
    if (!result.ok) {
      const message =
        result.reason === 'split'
          ? 'ההזמנה כוללת ספקים נוספים ולכן היא מאושרת מהמערכת'
          : 'הקישור אינו תקף יותר'
      return NextResponse.json({ error: message }, { status: result.reason === 'split' ? 409 : 403 })
    }

    const { view } = result

    if (view.status !== 'pending') {
      return NextResponse.json(
        { error: 'ההזמנה כבר טופלה', status: view.status },
        { status: 409 }
      )
    }

    // Defaults to what was ordered, because most confirmations are "yes, all of
    // it" and making the supplier retype the number invites a typo.
    const raw = body.confirmed_subtotal_excl_vat
    const amount = raw === undefined || raw === null || raw === '' ? view.submittedTotal : Number(raw)

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'סכום לא תקין' }, { status: 400 })
    }

    const note = typeof body.supplier_note === 'string' ? body.supplier_note.trim() : ''

    const { error } = await getSupabaseAdmin()
      .from('orders')
      .update({
        status: 'confirmed',
        confirmed_subtotal_excl_vat: amount,
        confirmed_at: new Date().toISOString(),
        supplier_note: note ? note.slice(0, 600) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', view.orderId)
      // Only from pending, so two clicks on the same link cannot overwrite a
      // confirmation that already happened.
      .eq('status', 'pending')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, confirmed_subtotal_excl_vat: amount })
  } catch (err) {
    console.error('Supplier confirm failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
