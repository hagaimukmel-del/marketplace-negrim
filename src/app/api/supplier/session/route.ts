import { NextResponse } from 'next/server'
import { clearSupplierCookie, getSessionSupplier } from '@/lib/supplier-auth'

/** Who this browser is signed in as, for the header to render a name. */
export async function GET() {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ signedIn: false })
  return NextResponse.json({ signedIn: true, company_name: supplier.company_name })
}

/** Sign out — on a shared computer, or to see what a stranger sees. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearSupplierCookie())
  return response
}
