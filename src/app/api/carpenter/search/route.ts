import { NextRequest, NextResponse } from 'next/server'
import { processProcurementRequest } from '@/lib/procurement-agent'

/**
 * POST /api/carpenter/search
 *
 * Carpenter search endpoint for procurement agent
 * Input: { message: "אני צריך דבק לבירץ׳" }
 * Output: Natural language response with product recommendations
 *
 * Public endpoint (no auth for now — carpenter identified by token in session)
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message required (non-empty string)' },
        { status: 400 }
      )
    }

    // Process request through agent
    const response = await processProcurementRequest({
      userMessage: message.trim(),
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
