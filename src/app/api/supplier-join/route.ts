import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * A supplier applies to sell on the marketplace.
 *
 * This is the second public endpoint that writes, and unlike /api/join it does
 * not hand anything back that grants access: an application lands as `pending`
 * and the operator decides. Nothing here can create a supplier that trades.
 *
 * Identity is the company number, which is unique in the table and is also the
 * entity that will issue invoices to carpenters. The phone is matched too, as
 * its last nine digits, so one business cannot arrive twice under a typo.
 */

/** Last nine digits. Israeli mobiles are 10 with the leading 0, or +972 and 9. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 9) return null
  return digits.slice(-9)
}

/** ח.פ / ע.מ is nine digits; eight is accepted because older numbers exist. */
function normaliseBusinessId(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 8 || digits.length === 9 ? digits : null
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/** What the applicant is told, per state. Never says why one was rejected. */
const ALREADY: Record<string, string> = {
  pending: 'כבר קיבלנו את הבקשה שלכם והיא ממתינה לאישור. נחזור אליכם בהקדם.',
  approved: 'הספק הזה כבר רשום ומאושר. אם אינכם מצליחים להיכנס, צרו קשר.',
  rejected: 'לא ניתן להשלים את ההרשמה. צרו קשר ונבדוק.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const companyName = text(body.company_name, 120)
    const businessId =
      typeof body.business_id === 'string' ? normaliseBusinessId(body.business_id) : null
    const phone = typeof body.phone === 'string' ? normalisePhone(body.phone) : null

    if (!companyName) {
      return NextResponse.json({ error: 'צריך שם חברה' }, { status: 400 })
    }
    if (!businessId) {
      return NextResponse.json({ error: 'ח.פ / ע.מ צריך להיות 9 ספרות' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
    }

    const email = text(body.email, 160)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Matched before inserting so the applicant gets a sentence that fits their
    // actual state, rather than a unique-constraint error.
    const { data: existing } = await supabase
      .from('suppliers')
      .select('status')
      .or(`business_id.eq.${businessId},phone_key.eq.${phone}`)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { ok: true, existing: true, status: existing.status, message: ALREADY[existing.status] },
        { status: 200 }
      )
    }

    const { error } = await supabase.from('suppliers').insert({
      company_name: companyName,
      business_id: businessId,
      contact_name: text(body.contact_name, 120),
      phone: text(body.phone, 40),
      phone_key: phone,
      email,
      city: text(body.city, 80),
      sells_note: text(body.sells_note, 600),
      status: 'pending',
      source: 'self',
      is_verified: false,
    })

    if (error) {
      // Both business_id and phone_key are unique; either can lose a race with
      // a second submission that arrived between the check above and here.
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: true, existing: true, status: 'pending', message: ALREADY.pending },
          { status: 200 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, existing: false, status: 'pending' }, { status: 201 })
  } catch (err) {
    console.error('Supplier join failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ההרשמה נכשלה' },
      { status: 500 }
    )
  }
}
