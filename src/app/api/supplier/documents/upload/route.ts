import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'

const DOC_TYPES = ['spec_sheet', 'usage_guide', 'image', 'datasheet', 'other'] as const
const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * A supplier attaches a technical document to a product they sell.
 *
 * Which supplier is never taken from the request: it comes from the signed
 * cookie and is re-checked as approved. The product must carry an offer from
 * that same supplier, so nobody can file a document under another company's
 * name. This used to live under /api/carpenter and expect a carpenter token
 * the supplier console never had, so every upload failed.
 */
export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const productId = formData.get('product_id')
    const docType = formData.get('doc_type')
    const title = formData.get('title_he')

    if (!(file instanceof File) || typeof productId !== 'string' || typeof docType !== 'string') {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }
    if (!(DOC_TYPES as readonly string[]).includes(docType)) {
      return NextResponse.json({ error: 'סוג מסמך לא תקין' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'הקובץ ריק או גדול מ-10MB' }, { status: 400 })
    }
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'אפשר להעלות PDF, JPG או PNG בלבד' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: offer } = await supabase
      .from('supplier_offers')
      .select('id')
      .eq('product_id', productId)
      .eq('supplier_id', supplier.id)
      .limit(1)
      .maybeSingle()

    if (!offer) {
      return NextResponse.json({ error: 'המוצר לא נמכר על ידך' }, { status: 403 })
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
    const path = `${productId}/${supplier.id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product_documents')
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Supplier document upload failed:', uploadError)
      return NextResponse.json({ error: 'ההעלאה נכשלה' }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from('product_documents').getPublicUrl(path)

    const { data: doc, error: docError } = await supabase
      .from('product_documents')
      .insert({
        product_id: productId,
        supplier_id: supplier.id,
        title_he: typeof title === 'string' && title.trim() ? title.trim() : file.name,
        doc_type: docType,
        file_url: publicUrl.publicUrl,
        file_name: file.name,
        file_size_kb: Math.ceil(file.size / 1024),
        content_type: file.type,
      })
      .select('id, file_url, title_he')
      .single()

    if (docError || !doc) {
      console.error('Supplier document insert failed:', docError)
      await supabase.storage.from('product_documents').remove([path])
      return NextResponse.json({ error: 'שמירת המסמך נכשלה' }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: doc }, { status: 201 })
  } catch (err) {
    console.error('Supplier document upload error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
