import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/debug/check-data
 * Check what test data exists in the database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // Check suppliers
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('company_name', 'ספק בדיקה — איתמיר')

    // Check products
    const { data: products } = await supabase
      .from('products')
      .select('id, name_he')
      .in('name_he', ['דבק Jowat 258.60', 'דבק Titebond Ultimate'])

    // Check specs
    const { data: specs } = await supabase
      .from('product_specifications')
      .select('id, product_id, spec_key, spec_value, is_verified')
      .eq('is_verified', true)
      .limit(10)

    // Check offers
    const { data: offers } = await supabase
      .from('supplier_offers')
      .select('id, product_id, supplier_id, price_excl_vat, stock_qty')
      .eq('is_active', true)
      .limit(10)

    return NextResponse.json({
      suppliers: suppliers || [],
      products: products || [],
      specs: specs || [],
      offers: offers || [],
    })
  } catch (err) {
    console.error('Debug error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
