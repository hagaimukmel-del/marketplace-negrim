import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isTestName, sendEmail } from '@/lib/email'
import { carpenterLoginHtml, carpenterLoginSubject } from '@/lib/emails/carpenter'
import { checkRateLimit, getRateLimitHeaders, getClientIP, hashIdentifier } from '@/lib/rate-limit'

const NEUTRAL = {
  ok: true,
  message: 'אם הפרטים רשומים אצלנו, שלחנו קישור כניסה למייל של הנגרייה. פתחו אותו במכשיר שבו רוצים להתחבר.',
}

/**
 * A carpenter's way in on another device.
 *
 * The link is mailed to the address on file, never shown here — so knowing a
 * carpenter's phone number is not enough to get into their account, you also
 * need their inbox. The answer is the same whether or not anyone matched, so
 * the form cannot be used to find out who is registered.
 *
 * A signed-in carpenter can ask for their own link too ("connect another
 * device") without typing anything.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const supabase = getSupabaseAdmin()

    // Rate limiting: only for login attempts (not self login)
    if (body.self !== true) {
      const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
      if (identifier) {
        const limitKey = `carpenter-login:${hashIdentifier(identifier)}`
        const limit = checkRateLimit(limitKey, 'login')

        if (!limit.allowed) {
          const headers = getRateLimitHeaders(limit)
          return NextResponse.json(
            { error: 'יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות' },
            { status: 429, headers }
          )
        }
      }
    }

    let carpenter: { business_name: string; email: string | null; token: string } | null = null

    if (body.self === true) {
      const session = await getSessionCarpenter()
      if (!session) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
      const { data } = await supabase
        .from('carpenters')
        .select('business_name, email, token')
        .eq('id', session.id)
        .maybeSingle()
      carpenter = data
      if (!carpenter?.email) {
        return NextResponse.json({ error: 'אין מייל בפרטים שלך — הוסיפו אותו למטה ונסו שוב' }, { status: 400 })
      }
    } else {
      const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
      if (!identifier) return NextResponse.json({ error: 'צריך מייל או טלפון' }, { status: 400 })

      if (identifier.includes('@')) {
        const pattern = identifier.toLowerCase().replace(/[\\%_]/g, (char: string) => `\\${char}`)
        const { data } = await supabase
          .from('carpenters')
          .select('business_name, email, token')
          .ilike('email', pattern)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        carpenter = data
      } else {
        const digits = identifier.replace(/\D/g, '')
        if (digits.length < 9) return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
        const { data } = await supabase
          .from('carpenters')
          .select('business_name, email, token')
          .eq('phone', digits.slice(-9))
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        carpenter = data
      }
    }

    if (carpenter?.email) {
      await sendEmail({
        to: carpenter.email,
        subject: carpenterLoginSubject(),
        html: carpenterLoginHtml({ businessName: carpenter.business_name, token: carpenter.token }),
        isTest: isTestName(carpenter.business_name),
      })
    }

    return NextResponse.json(body.self === true ? { ok: true, message: `שלחנו קישור כניסה ל-${carpenter!.email}` } : NEUTRAL)
  } catch (err) {
    console.error('Carpenter login link failed:', err)
    return NextResponse.json(NEUTRAL)
  }
}
