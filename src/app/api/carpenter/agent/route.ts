import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { llmConfigured, runAgent, type ChatTurn } from '@/lib/agent/llm-agent'

/** Turns of the conversation sent to the model, and the length of each. */
const MAX_TURNS = 12
const MAX_CHARS = 1000

/**
 * POST /api/carpenter/agent — the conversational agent.
 * Input: { messages: [{ role: 'user' | 'assistant', content }] }, oldest first,
 * ending with the carpenter's new message.
 *
 * Without ANTHROPIC_API_KEY it answers { fallback: true } and the chat uses the
 * keyword search (/api/carpenter/search) as before.
 */
export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
  if (!llmConfigured()) return NextResponse.json({ fallback: true })

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null
  const raw = Array.isArray(body?.messages) ? body.messages : []
  const turns: ChatTurn[] = raw
    .filter((turn): turn is ChatTurn =>
      Boolean(turn) &&
      ((turn as ChatTurn).role === 'user' || (turn as ChatTurn).role === 'assistant') &&
      typeof (turn as ChatTurn).content === 'string' &&
      (turn as ChatTurn).content.trim().length > 0
    )
    .slice(-MAX_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, MAX_CHARS) }))
  // The model needs the conversation to open with the carpenter and end with them
  while (turns.length && turns[0].role !== 'user') turns.shift()
  if (!turns.length || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'messages must end with the carpenter\'s message' }, { status: 400 })
  }

  const limit = checkRateLimit(`agent:${carpenter.id}`, 'agentChat')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'הגעת למכסת השאלות לסוכן להיום. אפשר להמשיך לחפש בקטלוג, ומחר הסוכן זמין שוב.' }, { status: 429 })
  }

  try {
    const reply = await runAgent(carpenter, turns)
    return NextResponse.json({ success: true, ...reply })
  } catch (err) {
    console.error('agent.llm failed', err)
    // The keyword search still works when the model is unreachable
    return NextResponse.json({ fallback: true })
  }
}
