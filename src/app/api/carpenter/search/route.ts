import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { processProcurementRequest } from '@/lib/procurement-agent'

/**
 * POST /api/carpenter/search
 *
 * Carpenter search endpoint for procurement agent
 * Input: { message: "אני צריך דבק לבירץ׳" }
 * Output: Natural language response with product recommendations
 *
 * Requires valid carpenter session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify carpenter session
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json(
        { error: 'חייב להיות מחובר' },
        { status: 401 }
      )
    }

    const { message } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message required (non-empty string)' },
        { status: 400 }
      )
    }

    // Process request through agent with carpenter context
    const response = await processProcurementRequest({
      userMessage: message.trim(),
      carpenterId: carpenter.id,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
