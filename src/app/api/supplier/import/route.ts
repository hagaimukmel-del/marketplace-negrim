import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { applyImport, planImport, resolveImportSupplier, sanitiseRows } from '@/lib/price-import-server'

/** Recent imports for this supplier, newest first, for the history and undo. */
export async function GET(request: NextRequest) {
  const who = await resolveImportSupplier(request.nextUrl.searchParams.get('supplier_id'))
  if (!who) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('import_batches')
    .select('id, file_name, summary, created_by, created_at, undone_at')
    .eq('supplier_id', who.supplierId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batches: data ?? [] })
}

/**
 * Preview or apply a price list.
 *
 * `preview` changes nothing and says what every row would do. `apply` works the
 * plan out again from the database and carries it out, skipping the rows the
 * person unticked.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const who = await resolveImportSupplier(body.supplier_id)
    if (!who) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

    const rows = sanitiseRows(body.rows)
    if (typeof rows === 'string') return NextResponse.json({ error: rows }, { status: 400 })

    if (body.mode === 'preview') {
      return NextResponse.json({ lines: await planImport(who.supplierId, rows) })
    }

    if (body.mode === 'apply') {
      const skip = new Set(
        (Array.isArray(body.skip) ? body.skip : []).filter((value): value is number => typeof value === 'number')
      )
      const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 200) : null
      const result = await applyImport({ supplierId: who.supplierId, createdBy: who.createdBy, fileName, rows, skip })
      return NextResponse.json({ ok: true, ...result })
    }

    return NextResponse.json({ error: 'מצב לא מוכר' }, { status: 400 })
  } catch (err) {
    console.error('Price import failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הייבוא נכשל' }, { status: 500 })
  }
}
