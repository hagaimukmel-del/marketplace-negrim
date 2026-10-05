import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getPreviousProducts } from '@/lib/procurement-agent'

/**
 * GET /api/carpenter/previous-products
 *
 * Retrieve products from carpenter's previous orders
 * Used for "כמו בפעם שעברה" lookups
 */
export async function GET(request: NextRequest) {
  try {
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
    }

    const products = await getPreviousProducts(carpenter.id, 10)

    return NextResponse.json(
      {
        success: true,
        products,
        count: products.length,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Previous products error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
