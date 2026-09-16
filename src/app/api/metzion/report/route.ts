import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isReportReason } from '@/lib/metzion'

/**
 * Flag a listing for the operator.
 *
 * Every board with content from its users needs this. One open report per
 * carpenter per listing: tapping twice should not look like two people
 * complaining.
 */
export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.listing_id !== 'string') {
      return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })
    }
    if (!isReportReason(body.reason)) {
      return NextResponse.json({ error: 'צריך לבחור סיבה' }, { status: 400 })
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null

    const supabase = getSupabaseAdmin()
    const { data: listing } = await supabase
      .from('metzion_listings')
      .select('id, carpenter_id')
      .eq('id', body.listing_id)
      .maybeSingle()
    if (!listing) return NextResponse.json({ error: 'המודעה לא נמצאה' }, { status: 404 })
    if (listing.carpenter_id === carpenter.id) {
      return NextResponse.json({ error: 'אי אפשר לדווח על מודעה שלך' }, { status: 400 })
    }

    const { data: open } = await supabase
      .from('metzion_reports')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('reporter_id', carpenter.id)
      .is('resolved_at', null)
      .limit(1)
    if (open && open.length > 0) return NextResponse.json({ ok: true, already: true })

    const { error } = await supabase.from('metzion_reports').insert({
      listing_id: listing.id,
      reporter_id: carpenter.id,
      reason: body.reason,
      note,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הדיווח נכשל' }, { status: 500 })
  }
}
