import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const KINDS = ['introduction', 'discount', 'restock'] as const

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (typeof body.product_id !== 'string' || !body.product_id) {
      return NextResponse.json({ error: 'בחר מוצר' }, { status: 400 })
    }
    if (!KINDS.includes(body.kind)) {
      return NextResponse.json({ error: 'סוג קמפיין לא תקין' }, { status: 400 })
    }

    const offerPrice =
      body.offer_price_excl_vat === '' || body.offer_price_excl_vat == null
        ? null
        : Number(body.offer_price_excl_vat)

    if (offerPrice != null && (!Number.isFinite(offerPrice) || offerPrice < 0)) {
      return NextResponse.json({ error: 'מחיר מבצע לא תקין' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // One campaign shows on the offer page at a time. Making a new one live
    // retires the previous, so two cannot silently compete for the same slot.
    if (body.activate !== false) {
      await supabase.from('campaigns').update({ is_active: false }).eq('is_active', true)
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'קמפיין',
        product_id: body.product_id,
        kind: body.kind,
        headline_he: typeof body.headline_he === 'string' ? body.headline_he.trim() || null : null,
        body_he: typeof body.body_he === 'string' ? body.body_he.trim() || null : null,
        offer_price_excl_vat: offerPrice,
        is_active: body.activate !== false,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, campaignId: data.id }, { status: 201 })
  } catch (err) {
    console.error('Campaign creation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
