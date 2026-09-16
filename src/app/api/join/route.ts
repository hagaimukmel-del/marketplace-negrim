import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { TERMS_VERSION } from '@/lib/terms'
import { isTestName, sendEmail } from '@/lib/email'
import { carpenterLoginHtml, carpenterLoginSubject } from '@/lib/emails/carpenter'

/** "h****l@gmail.com" — enough to recognise your own address, not to read someone else's. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.length <= 2 ? local[0] : `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`
  return `${visible}@${domain}`
}

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

    // Required from here on: it is where an order confirmation goes, and a
    // carpenter with no address is one we cannot tell that their order moved.
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 160).toLowerCase() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    // Nobody gets a link without accepting the terms first. Checked on the
    // server, because a disabled button is a suggestion.
    if (body.accept_terms !== true) {
      return NextResponse.json({ error: 'צריך לאשר את התקנון' }, { status: 400 })
    }
    const acceptance = {
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      marketing_consent: body.marketing_consent === true,
    }

    const supabase = getSupabaseAdmin()

    // Already known — from the operator's list or from an earlier submission.
    //
    // This used to hand the existing link straight back, which meant anyone who
    // typed a registered phone number walked into that carpenter's account. Now
    // the link goes to the email on file, and the page only says where it went.
    const { data: existing } = await supabase
      .from('carpenters')
      .select('id, token, is_active, email, business_name')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      if (!existing.is_active) {
        return NextResponse.json({ error: 'החשבון אינו פעיל. צור קשר.' }, { status: 403 })
      }
      if (existing.email) {
        await sendEmail({
          to: existing.email,
          subject: carpenterLoginSubject(),
          html: carpenterLoginHtml({ businessName: existing.business_name, token: existing.token }),
          isTest: isTestName(existing.business_name),
        })
      }
      return NextResponse.json({
        ok: true,
        existing: true,
        emailedTo: existing.email ? maskEmail(existing.email) : null,
      })
    }

    // Where a pallet actually goes. Asked here rather than left to the first
    // checkout so that an order can be placed without stopping to type it, and
    // so the operator can see at a glance whether a new signup is reachable.
    const address = typeof body.address === 'string' ? body.address.trim().slice(0, 200) : ''
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 80) : ''
    if (!address || !city) {
      return NextResponse.json({ error: 'צריך כתובת ועיר לאספקה' }, { status: 400 })
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
        email,
        address,
        city,
        source: 'self',
        ...acceptance,
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
