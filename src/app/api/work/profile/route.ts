import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { readProfileFields } from '@/lib/work'

/**
 * Save the capabilities profile, and with it join the service.
 *
 * Filling the profile is how a carpentry joins during the free launch: the
 * first save gives it a "founding" subscription. On conflict nothing happens,
 * so a later save never turns a paid or cancelled row back into founding.
 * Open before the board is, so the launch can wait for 30 profiles.
 */
export async function PUT(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    const fields = readProfileFields(body)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('work_profiles')
      .upsert({ carpenter_id: carpenter.id, ...fields, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { error: joinError } = await supabase
      .from('work_subscriptions')
      .upsert({ carpenter_id: carpenter.id, status: 'founding' }, { onConflict: 'carpenter_id', ignoreDuplicates: true })
    if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Work profile save failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'השמירה נכשלה' }, { status: 500 })
  }
}
