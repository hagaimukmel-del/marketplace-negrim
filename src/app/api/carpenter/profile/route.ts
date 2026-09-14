import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getCarpenterId } from '@/lib/carpenter-auth'

/**
 * A carpenter edits their own details.
 *
 * Which carpenter is never taken from the request. The id comes from the signed
 * cookie and nothing else — a body naming an id would be a way to edit somebody
 * else's business, and there is no reason to ever accept one.
 */

/** Last nine digits. Israeli mobiles are 10 with the leading 0, or +972 and 9. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : null
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export async function PATCH(request: NextRequest) {
  const carpenterId = await getCarpenterId()
  if (!carpenterId) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const businessName = text(body.business_name, 120)
    if (!businessName) {
      return NextResponse.json({ error: 'צריך שם נגרייה' }, { status: 400 })
    }

    const phone = typeof body.phone === 'string' ? normalisePhone(body.phone) : null
    if (!phone) {
      return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
    }

    const email = text(body.email, 160)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // The phone is the identity key — it is how /api/join recognises a returning
    // business. Changing it to one that already belongs to somebody else would
    // merge two carpentries, so it is refused rather than resolved.
    const { data: clash } = await supabase
      .from('carpenters')
      .select('id')
      .eq('phone', phone)
      .neq('id', carpenterId)
      .maybeSingle()

    if (clash) {
      return NextResponse.json(
        { error: 'מספר הטלפון הזה כבר רשום אצל נגרייה אחרת' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('carpenters')
      .update({
        business_name: businessName,
        contact_name: text(body.contact_name, 120),
        phone,
        email,
        city: text(body.city, 80),
        updated_at: new Date().toISOString(),
      })
      .eq('id', carpenterId)

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'הפרטים האלה כבר רשומים אצל נגרייה אחרת' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Carpenter profile update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
