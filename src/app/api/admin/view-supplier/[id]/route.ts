import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { buildSupplierCookie } from '@/lib/supplier-auth'
import { isOperatorManaged, logAdminAction } from '@/lib/admin-scope'

/**
 * The operator's way into a supplier's console, without the supplier's link.
 *
 * The view page used to render each supplier's entry token as a plain href, so
 * anyone looking over the operator's shoulder (or at his history) held the key.
 * This route checks the admin cookie and sets the supplier session itself; the
 * token never leaves the server. No new-device email goes out — it is the
 * operator, not a stranger — but opening a self-run supplier's console is
 * written to admin_actions so the supplier can be told who looked.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const { id } = await params
  const { data: supplier } = await getSupabaseAdmin()
    .from('suppliers')
    .select('id, status, source')
    .eq('id', id)
    .maybeSingle()

  if (!supplier || supplier.status !== 'approved') {
    return NextResponse.redirect(new URL('/admin/view/supplier', request.url))
  }

  if (!isOperatorManaged(supplier.source)) {
    await logAdminAction({ action: 'open_supplier_console', supplierId: supplier.id })
  }

  const response = NextResponse.redirect(new URL('/supplier', request.url))
  response.cookies.set(buildSupplierCookie(supplier.id))
  return response
}
