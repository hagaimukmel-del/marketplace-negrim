import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { confirmOrder } from '@/lib/order-agent'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/carpenter/order/confirm
 *
 * Carpenter confirms selection:
 * - Revalidates live data
 * - Creates order
 * - Returns confirmation
 *
 * ⚠️ REQUIRES AUTHENTICATION — carpenterId must match session
 */
export async function POST(request: NextRequest) {
  try {
    // VERIFY SESSION FIRST
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
    }

    // Same rule as /api/orders: no order reaches a supplier before the email is confirmed
    const { data: record } = await getSupabaseAdmin().from('carpenters').select('email_verified_at').eq('id', carpenter.id).maybeSingle()
    if (!record?.email_verified_at) {
      return NextResponse.json({ error: 'לפני ההזמנה הראשונה צריך לאשר את המייל: לחצו על הקישור ששלחנו אליכם.', code: 'email_unverified' }, { status: 403 })
    }

    const { productId, supplierId, quantity } = await request.json()

    // Validation
    if (!productId || !supplierId) {
      return NextResponse.json(
        {
          error: 'productId and supplierId required',
        },
        { status: 400 }
      )
    }

    // Process order confirmation (carpenterId from authenticated session)
    const result = await confirmOrder({
      carpenterId: carpenter.id,
      productId,
      supplierId,
      quantity: quantity || 1,
    })

    return NextResponse.json(result, {
      status: result.success ? 201 : 400,
    })
  } catch (err) {
    console.error('Confirm order error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
