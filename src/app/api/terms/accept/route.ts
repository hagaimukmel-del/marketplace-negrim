import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { TERMS_VERSION } from '@/lib/terms'

/**
 * Accept the current terms, as whoever the session says you are.
 *
 * For people who came in before the terms existed — carpenters imported from a
 * list, suppliers the operator opened by hand — and for everyone again when the
 * version changes. The role comes from the request only to say which session to
 * look at; the identity always comes from the signed cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const now = new Date().toISOString()
    const supabase = getSupabaseAdmin()

    if (body.role === 'supplier') {
      const supplier = await getSessionSupplier()
      if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

      const { error } = await supabase
        .from('suppliers')
        .update({ terms_accepted_at: now, terms_version: TERMS_VERSION, updated_at: now })
        .eq('id', supplier.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.role === 'carpenter') {
      const carpenter = await getSessionCarpenter()
      if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

      const { error } = await supabase
        .from('carpenters')
        .update({
          terms_accepted_at: now,
          terms_version: TERMS_VERSION,
          ...(typeof body.marketing_consent === 'boolean'
            ? { marketing_consent: body.marketing_consent }
            : {}),
          updated_at: now,
        })
        .eq('id', carpenter.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'תפקיד לא מוכר' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
