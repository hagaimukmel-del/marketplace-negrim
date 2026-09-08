import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Self sign-up for a carpenter.
 *
 * This is the one public endpoint that writes to `carpenters`, so it is
 * deliberately narrow. It takes a business name and a phone, nothing else, and
 * the phone is the identity: normalised to its last nine digits so that
 * 050-123-4567, 0501234567 and +972501234567 are one business.
 *
 * That normalisation is also the abuse control. Someone submitting the form
 * repeatedly does not accumulate rows — they get handed back the same link
 * every time, because the phone already exists. Rows created here are marked
 * source = 'self' so the operator can tell them apart from their own list.
 */

/** Last nine digits. Israeli mobiles are 10 with the leading 0, or +972 and 9. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 9) return null
  return digits.slice(-9)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const businessName =
      typeof body.business_name === 'string' ? body.business_name.trim() : ''
    const phone = typeof body.phone === 'string' ? normalisePhone(body.phone) : null

    if (!businessName) {
      return NextResponse.json({ error: 'צריך שם נגרייה' }, { status: 400 })
    }
    if (businessName.length > 120) {
      return NextResponse.json({ error: 'שם ארוך מדי' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Already known — from the operator's list or from an earlier submission.
    // Hand back the existing link rather than issuing a second one, which would
    // split one business across two identities.
    const { data: existing } = await supabase
      .from('carpenters')
      .select('token, is_active')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      if (!existing.is_active) {
        return NextResponse.json({ error: 'החשבון אינו פעיל. צור קשר.' }, { status: 403 })
      }
      return NextResponse.json({ ok: true, token: existing.token, existing: true })
    }

    const { data, error } = await supabase
      .from('carpenters')
      .insert({
        business_name: businessName,
        contact_name:
          typeof body.contact_name === 'string' && body.contact_name.trim()
            ? body.contact_name.trim()
            : null,
        phone,
        city:
          typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null,
        source: 'self',
      })
      .select('token')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'ההרשמה נכשלה' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, token: data.token, existing: false }, { status: 201 })
  } catch (err) {
    console.error('Join failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ההרשמה נכשלה' },
      { status: 500 }
    )
  }
}
