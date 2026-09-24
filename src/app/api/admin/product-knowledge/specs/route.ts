import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/product-knowledge/specs
 *
 * Add a specification to a product.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      product_id,
      spec_key,
      spec_value,
      spec_unit,
      source_document_id,
      source_page_or_section,
    } = await request.json()

    // Validation
    if (!product_id || !spec_key || !spec_value) {
      return NextResponse.json(
        { error: 'product_id, spec_key, and spec_value required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Insert spec
    const { data: spec, error: specError } = await supabase
      .from('product_specifications')
      .insert({
        product_id,
        spec_key: spec_key.toLowerCase(), // Normalize key
        spec_value: spec_value.trim(),
        spec_unit: spec_unit || null,
        source_document_id: source_document_id || null,
        source_page_or_section: source_page_or_section || null,
      })
      .select()
      .single()

    if (specError) {
      console.error('Spec error:', specError)
      return NextResponse.json({ error: 'Failed to add specification' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        specification: {
          id: spec.id,
          product_id: spec.product_id,
          spec_key: spec.spec_key,
          spec_value: spec.spec_value,
          spec_unit: spec.spec_unit,
          created_at: spec.created_at,
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
 * GET /api/admin/product-knowledge/specs?product_id=...
 *
 * Get all specifications for a product.
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('product_id')
    const verifiedOnly = request.nextUrl.searchParams.get('verified_only') === 'true'

    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('product_specifications')
      .select('*')
      .eq('product_id', productId)
      .order('spec_key', { ascending: true })

    if (verifiedOnly) {
      query = query.eq('is_verified', true)
    }

    const { data: specs, error } = await query

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch specifications' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product_id: productId,
      verified_only: verifiedOnly,
      specifications: specs || [],
      count: specs?.length || 0,
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
 * PATCH /api/admin/product-knowledge/specs/[id]
 *
 * Update a specification (mark as verified, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const specId = pathParts[pathParts.length - 1]

    if (!specId) {
      return NextResponse.json({ error: 'spec_id required' }, { status: 400 })
    }

    const updates = await request.json()

    const supabase = getSupabaseAdmin()

    // Only allow updating is_verified and spec_value
    interface SpecUpdate {
      is_verified?: boolean
      verified_at?: string
      spec_value?: string
      spec_unit?: string | null
    }

    const allowedUpdates: SpecUpdate = {}
    if ('is_verified' in updates) {
      allowedUpdates.is_verified = updates.is_verified === true
      if (updates.is_verified) {
        allowedUpdates.verified_at = new Date().toISOString()
      }
    }
    if ('spec_value' in updates) {
      allowedUpdates.spec_value = String(updates.spec_value).trim()
    }
    if ('spec_unit' in updates) {
      allowedUpdates.spec_unit = updates.spec_unit || null
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: spec, error } = await supabase
      .from('product_specifications')
      .update(allowedUpdates as any)
      .eq('id', specId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update specification' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      specification: spec,
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
 * DELETE /api/admin/product-knowledge/specs/[id]
 *
 * Delete a specification.
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
    const specId = pathParts[pathParts.length - 1]

    if (!specId) {
      return NextResponse.json({ error: 'spec_id required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('product_specifications')
      .delete()
      .eq('id', specId)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete specification' }, { status: 500 })
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
