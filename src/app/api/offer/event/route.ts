import { NextRequest, NextResponse } from 'next/server'
import { logEvent, resolveCarpenter } from '@/lib/offer'

/** The only event types the offer page is allowed to report. */
const CLIENT_EVENTS = ['item_added', 'search_no_results'] as const
type ClientEvent = (typeof CLIENT_EVENTS)[number]

function isClientEvent(value: unknown): value is ClientEvent {
  return typeof value === 'string' && (CLIENT_EVENTS as readonly string[]).includes(value)
}

/**
 * Events reported by the browser.
 *
 * The carpenter is resolved from the token here rather than taken from the
 * request body — otherwise anyone could attribute activity to anyone, and the
 * behavioural data this business is trying to accumulate would be worthless.
 * `offer_opened` and `order_sent` are written server-side where they happen and
 * are deliberately not accepted here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!isClientEvent(body.event_type)) {
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 })
    }

    const carpenter = await resolveCarpenter(body.token)
    if (!carpenter) {
      return NextResponse.json({ error: 'Unknown link' }, { status: 404 })
    }

    await logEvent(body.event_type, {
      carpenter_id: carpenter.id,
      campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
      product_id: typeof body.product_id === 'string' ? body.product_id : null,
      metadata: typeof body.query === 'string' ? { query: body.query } : null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Logging must never surface as an error to the person ordering.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
