import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/product-knowledge/link
 *
 * Link a supplier document to a product.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { document_id, product_id, section_reference } = await request.json()

    // Validation
    if (!document_id || !product_id) {
      return NextResponse.json(
        { error: 'document_id and product_id required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify document exists
    const { data: doc } = await supabase
      .from('supplier_documents')
      .select('id')
      .eq('id', document_id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Create link
    const { data: link, error: linkError } = await supabase
      .from('supplier_documents_products')
      .insert({
        document_id,
        product_id,
        section_reference: section_reference || null,
      })
      .select()
      .single()

    if (linkError) {
      // Check if it's a unique constraint violation
      if (linkError.code === '23505') {
        return NextResponse.json(
          { error: 'Document already linked to this product' },
          { status: 409 }
        )
      }
      console.error('Link error:', linkError)
      return NextResponse.json({ error: 'Failed to link document' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        link: {
          id: link.id,
          document_id: link.document_id,
          product_id: link.product_id,
          created_at: link.created_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/product-knowledge/link?product_id=...
 *
 * List all documents linked to a product.
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('product_id')
    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Get linked documents
    const { data: links, error } = await supabase
      .from('supplier_documents_products')
      .select(
        `
        id,
        section_reference,
        created_at,
        supplier_documents (
          id,
          file_name,
          document_type,
          language
        )
      `
      )
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product_id: productId,
      documents: links || [],
      count: links?.length || 0,
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
 * DELETE /api/admin/product-knowledge/link/[id]
 *
 * Unlink a document from a product.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const linkId = pathParts[pathParts.length - 1]

    if (!linkId) {
      return NextResponse.json({ error: 'link_id required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('supplier_documents_products')
      .delete()
      .eq('id', linkId)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
