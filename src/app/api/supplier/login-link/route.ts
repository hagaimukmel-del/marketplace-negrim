import { NextRequest, NextResponse } from 'next/server'
import { safeNext } from '@/lib/notification-links'
import { findApprovedSupplierByEmail, sendSupplierLoginEmail } from '@/lib/supplier-login'
import { checkRateLimit, getClientIP, getRateLimitHeaders, hashIdentifier } from '@/lib/rate-limit'

/**
 * A registered supplier asks for their way in again.
 *
 * The email carries a six-digit code to type on the page that asked
 * (/api/supplier/login-code), and the entry link for opening on any device.
 * The link is mailed to the address already on file and never returned here.
 * Returning it would make an email address enough to take over a supplier's
 * price list; mailing it means you also have to own the inbox.
 *
 * The answer is the same whether or not the address belongs to anyone, so the
 * form cannot be used to find out which companies are suppliers.
 */
const NEUTRAL = {
  ok: true,
  message: 'אם הכתובת רשומה אצלנו כספק מאושר, שלחנו אליה קוד כניסה. הקלידו אותו כאן.',
}

export async function POST(request: NextRequest) {
  // Every call can send a mail, so an open loop could flood a supplier's inbox
  // and spend the domain's sending reputation.
  const limit = checkRateLimit(`supplier-link-ip:${hashIdentifier(getClientIP(request))}`, 'supplierLink')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד 15 דקות' }, { status: 429, headers: getRateLimitHeaders(limit) })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const next = safeNext(typeof body.next === 'string' ? body.next : null, '/supplier')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    const supplier = await findApprovedSupplierByEmail(email)
    if (supplier) await sendSupplierLoginEmail(supplier, next)

    return NextResponse.json(NEUTRAL)
  } catch (err) {
    // Even a failure answers neutrally: an error that only happens for real
    // suppliers would tell a stranger which addresses are registered.
    console.error('Supplier login link failed:', err)
    return NextResponse.json(NEUTRAL)
  }
}
