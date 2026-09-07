import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logEvent, resolveCarpenter } from '@/lib/offer'

/**
 * "I'd take 40 of these at the right price."
 *
 * Deliberately not an order. It records demand the platform would otherwise
 * lose the moment a carpenter decides the listed quantity does not suit him,
 * and it is the raw material for buying in bulk: thirty of these against one
 * product is the volume you take to a distributor to ask what price it buys.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const carpenter = await resolveCarpenter(body.token)
    if (!carpenter) {
      return NextResponse.json({ error: 'Unknown link' }, { status: 404 })
    }

    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }
    if (typeof body.product_id !== 'string') {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('order_intents')
      .insert({
        carpenter_id: carpenter.id,
        product_id: body.product_id,
        campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
        quantity,
        note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logEvent('intent_registered', {
      carpenter_id: carpenter.id,
      campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
      product_id: body.product_id,
      metadata: { quantity },
    })

    return NextResponse.json({ ok: true, intentId: data.id }, { status: 201 })
  } catch (err) {
    console.error('Intent creation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
