import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/supplier-documents?supplier_id=...
 *
 * List all documents for a supplier.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Record admin login attempt for RLS (required by policy)
    const supabase = getSupabaseAdmin()
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    await supabase
      .from('admin_login_attempts')
      .insert({ ip: clientIp, succeeded: true })
      .throwOnError()

    // Get supplier_id from query
    const supplierId = request.nextUrl.searchParams.get('supplier_id')
    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplier_id query parameter required' },
        { status: 400 }
      )
    }

    // Verify supplier exists
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // List documents
    const { data: documents, error: listError } = await supabase
      .from('supplier_documents')
      .select('id, file_name, document_type, language, description, uploaded_at, is_active')
      .eq('supplier_id', supplierId)
      .order('uploaded_at', { ascending: false })

    if (listError) {
      console.error('List error:', listError)
      return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      supplier_id: supplierId,
      documents: documents || [],
      count: documents?.length || 0,
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/supplier-documents/[id]
 *
 * Delete a supplier document and its file.
 * Admin only.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Record admin login attempt for RLS (required by policy)
    const supabase = getSupabaseAdmin()
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    await supabase
      .from('admin_login_attempts')
      .insert({ ip: clientIp, succeeded: true })
      .throwOnError()

    // Get document_id from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const documentId = pathParts[pathParts.length - 1]

    if (!documentId) {
      return NextResponse.json({ error: 'document_id required' }, { status: 400 })
    }

    // Get document to find file path
    const { data: document, error: getError } = await supabase
      .from('supplier_documents')
      .select('id, file_path')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('supplier-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway; DB record might be orphaned but manageable
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('supplier_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
