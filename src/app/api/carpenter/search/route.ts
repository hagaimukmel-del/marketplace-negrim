import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { processProcurementRequest } from '@/lib/procurement-agent'
import { answerWithClaude, type ChatTurn } from '@/lib/agent-llm'

/** A question, not a document: longer input is cut before it reaches the agent. */
const MAX_MESSAGE = 300

/** The last few chat turns, as the client sent them; only ever context for Claude. */
function historyOf(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(-6)
    .filter((turn): turn is ChatTurn => (turn?.role === 'user' || turn?.role === 'agent') && typeof turn.text === 'string')
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 500) }))
}

/**
 * POST /api/carpenter/search
 *
 * Carpenter search endpoint for procurement agent
 * Input: { message: "אני צריך דבק לבירץ׳", history?: [{ role: 'user' | 'agent', text }] }
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

    const { message, history } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message required (non-empty string)' },
        { status: 400 }
      )
    }

    // Process request through agent with carpenter context
    const userMessage = message.trim().slice(0, MAX_MESSAGE)
    const agentRequest = { userMessage, carpenterId: carpenter.id, city: carpenter.city }
    // Claude reads the request when configured; the keyword agent answers otherwise (T-007)
    const response =
      (await answerWithClaude({ ...agentRequest, history: historyOf(history) })) ??
      { ...(await processProcurementRequest(agentRequest)), engine: 'keywords' as const }

    // One line per question, so the Vercel logs show what carpenters ask and what they got
    console.info(
      'agent.search',
      JSON.stringify({ carpenter: carpenter.id, message: userMessage, state: response.state, matches: response.matchCount, engine: response.engine })
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
