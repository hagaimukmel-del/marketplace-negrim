import { NextRequest, NextResponse } from 'next/server'
import { buildSupplierCookie, getSupplierId, resolveSupplierToken } from '@/lib/supplier-auth'
import { isTestName, sendEmail } from '@/lib/email'
import { deviceLabel, newDeviceHtml, newDeviceSubject } from '@/lib/emails/new-device'

/**
 * The supplier's way in.
 *
 * A route handler rather than a page, because only a handler may set a cookie —
 * and the whole job here is to trade the link for a session and get out of the
 * way. The supplier follows one URL and lands in their console already signed
 * in; there is no form and no password.
 *
 * An unknown or not-yet-approved token gets the sign-up page, not an error
 * telling it which of the two it was.
 *
 * A browser that was not already signed in as this supplier triggers a notice
 * to the supplier's email (T-020): the link is the key, so the owner should
 * know when it opens a new door.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supplier = await resolveSupplierToken(token)

  if (!supplier) {
    return NextResponse.redirect(new URL('/supplier/join?link=invalid', request.url))
  }

  if ((await getSupplierId()) !== supplier.id && supplier.email) {
    try {
      await sendEmail({
        to: supplier.email,
        subject: newDeviceSubject(),
        html: newDeviceHtml({ accountName: supplier.company_name, device: deviceLabel(request.headers.get('user-agent')) }),
        isTest: isTestName(supplier.company_name),
      })
    } catch (err) {
      console.error('New-device notice failed:', err)
    }
  }

  const response = NextResponse.redirect(new URL('/supplier', request.url))
  response.cookies.set(buildSupplierCookie(supplier.id))
  return response
}
