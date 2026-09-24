import { NextRequest, NextResponse } from 'next/server'
import { confirmOrder } from '@/lib/order-agent'

/**
 * POST /api/carpenter/order/confirm
 *
 * Carpenter confirms selection:
 * - Revalidates live data
 * - Creates order
 * - Returns confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const { carpenterId, productId, supplierId, quantity } = await request.json()

    // Validation
    if (!carpenterId || !productId || !supplierId) {
      return NextResponse.json(
        {
          error: 'carpenterId, productId, and supplierId required',
        },
        { status: 400 }
      )
    }

    // Process order confirmation
    const result = await confirmOrder({
      carpenterId,
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
