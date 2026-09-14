import { NextRequest, NextResponse } from 'next/server'
import { buildSupplierCookie, resolveSupplierToken } from '@/lib/supplier-auth'

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

  const response = NextResponse.redirect(new URL('/supplier', request.url))
  response.cookies.set(buildSupplierCookie(supplier.id))
  return response
}
