import { NextRequest, NextResponse } from 'next/server'
import { resolveImportSupplier, undoImport } from '@/lib/price-import-server'

/** Undo a price-list import: prices back, added products out. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const who = await resolveImportSupplier(body.supplier_id)
    if (!who) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
    if (typeof body.batch_id !== 'string') {
      return NextResponse.json({ error: 'חסר ייבוא' }, { status: 400 })
    }

    const result = await undoImport(body.batch_id, who.supplierId)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הביטול נכשל' }, { status: 500 })
  }
}
