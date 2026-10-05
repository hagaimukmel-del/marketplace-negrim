import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { processProcurementRequest } from '@/lib/procurement-agent'

/** A question, not a document: longer input is cut before it reaches the agent. */
const MAX_MESSAGE = 300

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
    const userMessage = message.trim().slice(0, MAX_MESSAGE)
    const response = await processProcurementRequest({
      userMessage,
      carpenterId: carpenter.id,
    })

    // One line per question, so the Vercel logs show what carpenters ask and what they got
    console.info(
      'agent.search',
      JSON.stringify({ carpenter: carpenter.id, message: userMessage, state: response.state, matches: response.matchedProducts?.length ?? 0 })
    )

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
