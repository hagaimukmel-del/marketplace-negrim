import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/carpenter/orders
 *
 * Retrieve carpenter's order history
 * Returns list of orders with order items, sorted by most recent first
 */
export async function GET(request: NextRequest) {
  try {
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch carpenter's orders with order items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        short_number,
        supplier_id,
        status,
        subtotal_excl_vat,
        vat_rate,
        total_amount,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name_he,
          product_name_en,
          unit_price_excl_vat,
          quantity
        )
      `
      )
      .eq('carpenter_id', carpenter.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (ordersError) {
      console.error('Orders query error:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        orders: orders || [],
        count: orders?.length || 0,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Get orders error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
