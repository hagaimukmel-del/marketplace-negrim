import { NextRequest, NextResponse } from 'next/server'
import { verifyResendSignature, deliveryUpdateOf } from '@/lib/resend-webhook'
import { applyDeliveryUpdate } from '@/lib/email-delivery'

/**
 * POST /api/webhooks/resend — what happened to each email (communication
 * plan, step 2): delivered, bounced, marked as spam, failed.
 *
 * Signed with RESEND_WEBHOOK_SECRET (Resend dashboard → Webhooks). Without
 * the secret every call is refused: an open endpoint could mark any address as
 * bouncing. Answers 200 to reports it does not act on, so Resend stops
 * resending them.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const valid = verifyResendSignature(
    process.env.RESEND_WEBHOOK_SECRET,
    {
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    },
    body
  )
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

  let event: unknown
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const update = deliveryUpdateOf(event as Parameters<typeof deliveryUpdateOf>[0])
  if (!update) return NextResponse.json({ ok: true, ignored: true })

  try {
    const { matched } = await applyDeliveryUpdate(update)
    return NextResponse.json({ ok: true, matched })
  } catch (err) {
    // A 5xx makes Resend try again later, which is what we want here.
    console.error('[webhook] resend update failed', err)
    return NextResponse.json({ error: 'not saved' }, { status: 500 })
  }
}
