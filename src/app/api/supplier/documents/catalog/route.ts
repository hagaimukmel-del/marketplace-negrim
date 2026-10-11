import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { BUCKET, CATALOG_PREFIX } from '@/lib/supplier-documents'

const MAX_BYTES = 20 * 1024 * 1024
const MAX_CATALOGS = 10

/**
 * A supplier uploads a catalogue for the whole business (a PDF), shown to
 * carpenters on the pages of the products this supplier sells.
 */
export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title')
    if (!(file instanceof File)) return NextResponse.json({ error: 'חסר קובץ' }, { status: 400 })
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'קטלוג מעלים כקובץ PDF' }, { status: 400 })
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'הקובץ ריק או גדול מ-20MB' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { count } = await supabase
      .from('supplier_documents')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .like('file_path', `${CATALOG_PREFIX}%`)
    if ((count ?? 0) >= MAX_CATALOGS) {
      return NextResponse.json({ error: `אפשר עד ${MAX_CATALOGS} קטלוגים. מחק אחד ישן קודם.` }, { status: 400 })
    }

    const path = `${CATALOG_PREFIX}${supplier.id}/${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })
    if (uploadError) {
      console.error('Supplier catalogue upload failed:', uploadError)
      return NextResponse.json({ error: 'ההעלאה נכשלה' }, { status: 500 })
    }

    const { error: rowError } = await supabase.from('supplier_documents').insert({
      supplier_id: supplier.id,
      file_name: file.name.slice(0, 200),
      file_path: path,
      file_size: file.size,
      file_type: file.type,
      document_type: 'catalog',
      description: typeof title === 'string' && title.trim() ? title.trim().slice(0, 120) : null,
      uploaded_by: null,
    })
    if (rowError) {
      console.error('Supplier catalogue row failed:', rowError)
      await supabase.storage.from(BUCKET).remove([path])
      return NextResponse.json({ error: 'שמירת הקטלוג נכשלה' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('Supplier catalogue upload error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
