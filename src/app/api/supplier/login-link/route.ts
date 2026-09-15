import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName, sendEmail } from '@/lib/email'
import { supplierLoginLinkHtml, supplierLoginLinkSubject } from '@/lib/emails/supplier-login-link'

/**
 * A registered supplier asks for their way in again.
 *
 * The link is mailed to the address already on file and never returned here.
 * Returning it would make an email address enough to take over a supplier's
 * price list; mailing it means you also have to own the inbox.
 *
 * The answer is the same whether or not the address belongs to anyone, so the
 * form cannot be used to find out which companies are suppliers.
 */
const NEUTRAL = {
  ok: true,
  message: 'אם הכתובת רשומה אצלנו כספק מאושר, קישור כניסה נשלח אליה עכשיו.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    // Case-insensitive, because rows written before emails were lowercased on
    // save still hold them as typed — an exact match missed ITAMIRLTD1@GMAIL.COM
    // and silently sent nothing. The pattern's wildcards are escaped so an
    // underscore in an address matches only an underscore.
    const pattern = email.replace(/[\\%_]/g, (char: string) => `\\${char}`)

    const { data: supplier } = await getSupabaseAdmin()
      .from('suppliers')
      .select('company_name, email, token')
      .ilike('email', pattern)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()

    if (supplier?.email && supplier.token) {
      await sendEmail({
        to: supplier.email,
        subject: supplierLoginLinkSubject(),
        html: supplierLoginLinkHtml({ companyName: supplier.company_name, token: supplier.token }),
        isTest: isTestName(supplier.company_name),
      })
    }

    return NextResponse.json(NEUTRAL)
  } catch (err) {
    // Even a failure answers neutrally: an error that only happens for real
    // suppliers would tell a stranger which addresses are registered.
    console.error('Supplier login link failed:', err)
    return NextResponse.json(NEUTRAL)
  }
}
