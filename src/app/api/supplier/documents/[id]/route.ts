import { NextRequest, NextResponse } from 'next/server'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { removeCatalog, removeSheet } from '@/lib/supplier-documents'

/**
 * A supplier deletes one of their own files: `?kind=sheet` (a product's
 * technical sheet) or `?kind=catalog` (the business catalogue). The row is
 * matched on the session's supplier as well as the id, so another company's
 * file id deletes nothing.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  const { id } = await params
  const kind = request.nextUrl.searchParams.get('kind')
  if (kind !== 'sheet' && kind !== 'catalog') {
    return NextResponse.json({ error: 'סוג מסמך לא מוכר' }, { status: 400 })
  }

  const removed = kind === 'sheet' ? await removeSheet(id, supplier.id) : await removeCatalog(id, supplier.id)
  if (!removed) return NextResponse.json({ error: 'המסמך לא נמצא' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
