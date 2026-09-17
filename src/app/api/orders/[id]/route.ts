/**
 * Read one order.
 *
 * This file used to export a PATCH as well, with no authentication of any kind:
 * anyone on the internet could change any order's status and notes, and the
 * response handed back the whole record — customer name, email, phone and
 * address. Nothing called it. Every status change in the application goes
 * through /api/admin/orders/[id], which is behind the operator password, so it
 * is deleted rather than guarded.
 */
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveCarpenter } from '@/lib/offer'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // An order id alone used to be enough to read someone's name, phone,
    // address and prices. The caller has to prove the order is theirs.
    // The token from this browser, or the signed session cookie of a carpenter
    // who came in from an emailed login link.
    const token = request.nextUrl.searchParams.get('token')
    const session = token ? null : await getSessionCarpenter()
    const carpenter = token
      ? await resolveCarpenter(token)
      : session
        ? await resolveCarpenter(session.token)
        : null

    if (!carpenter) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*), suppliers(company_name, phone)')
      .eq('id', id)
      .eq('carpenter_id', carpenter.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // The other purchase orders sent in the same checkout, to other suppliers.
    const { data: siblings } = data.checkout_id
      ? await getSupabaseAdmin()
          .from('orders')
          .select('id, order_number, status, subtotal_excl_vat, suppliers(company_name)')
          .eq('checkout_id', data.checkout_id)
          .eq('carpenter_id', carpenter.id)
          .neq('id', data.id)
      : { data: [] }

    return NextResponse.json({ order: data, siblings: siblings ?? [] })
  } catch (err) {
    console.error('Order fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
