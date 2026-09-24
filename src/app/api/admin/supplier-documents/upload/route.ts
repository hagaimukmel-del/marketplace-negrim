import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/supplier-documents/upload
 *
 * Upload a supplier document (TDS, SDS, catalog, etc.)
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const supplierId = formData.get('supplier_id') as string | null
    const documentType = formData.get('document_type') as string | null
    const language = (formData.get('language') as string | null) || 'he'
    const description = formData.get('description') as string | null

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!supplierId) {
      return NextResponse.json({ error: 'supplier_id required' }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: 'document_type required' }, { status: 400 })
    }

    const validDocTypes = ['TDS', 'SDS', 'catalog', 'specification', 'guide', 'tutorial', 'faq', 'compatibility']
    if (!validDocTypes.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid document_type. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // File size limit: 50MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 })
    }

    // Verify supplier exists
    const supabase = getSupabaseAdmin()
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Upload file to Supabase Storage
    const storagePath = `suppliers/${supplierId}/${Date.now()}_${file.name}`
    const buffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('supplier-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Record in database
    // Get current user ID from auth context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Failed to get user context' }, { status: 500 })
    }

    const { data: document, error: dbError } = await supabase
      .from('supplier_documents')
      .insert({
        supplier_id: supplierId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        file_type: file.type,
        document_type: documentType,
        language,
        description: description || null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file on DB error
      await supabase.storage.from('supplier-documents').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to save document metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          file_name: document.file_name,
          document_type: document.document_type,
          uploaded_at: document.uploaded_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
