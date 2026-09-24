import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/demo/seed-agent
 *
 * Create demo products and specs for testing the procurement agent
 * WARNING: Only for development/testing!
 */
export async function POST(request: NextRequest) {
  try {
    // Security: only allow in dev
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Get or create a demo supplier
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_name', 'Demo Supplier Co.')
      .limit(1)

    let supplierId = suppliers?.[0]?.id

    if (!supplierId) {
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          company_name: 'Demo Supplier Co.',
          business_id: 'demo-business',
          status: 'approved',
          source: 'demo',
          token: 'demo-token-' + Math.random().toString(36).slice(2, 9),
        })
        .select('id')
        .single()

      if (supplierError || !newSupplier) {
        throw new Error(`Failed to create supplier: ${supplierError?.message}`)
      }
      supplierId = newSupplier.id
    }

    // 2. Create demo products
    const demoProducts = [
      {
        name_he: 'דבק Jowat 258.60',
        name_en: 'Jowat 258.60 Adhesive',
        description_he: 'דבק מיוחד להדבקת בירץ וחומרים דומים',
        base_unit: 'kg',
      },
      {
        name_he: 'דבק Titebond Ultimate',
        name_en: 'Titebond Ultimate III',
        description_he: 'דבק אוניברסלי עמיד למים',
        base_unit: 'liter',
      },
    ]

    const createdProducts: string[] = []

    for (const product of demoProducts) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name_he', product.name_he)
        .limit(1)

      if (existingProduct?.length) {
        createdProducts.push(existingProduct[0].id)
        continue
      }

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name_he: product.name_he,
          name_en: product.name_en,
          description_he: product.description_he,
          base_unit: product.base_unit,
        })
        .select('id')
        .single()

      if (productError || !newProduct) {
        throw new Error(`Failed to create product: ${productError?.message}`)
      }
      createdProducts.push(newProduct.id)
    }

    // 3. Create demo specs
    const demoSpecs: Array<{
      product_id: string
      spec_key: string
      spec_value: string
      spec_unit?: string | null
      is_verified: boolean
    }> = [
      {
        product_id: createdProducts[0],
        spec_key: 'material',
        spec_value: 'birch',
        is_verified: true,
      },
      {
        product_id: createdProducts[0],
        spec_key: 'application',
        spec_value: 'bonding wood veneer and solids',
        is_verified: true,
      },
      {
        product_id: createdProducts[0],
        spec_key: 'curing_time',
        spec_value: '24',
        spec_unit: 'hours',
        is_verified: true,
      },
      {
        product_id: createdProducts[1],
        spec_key: 'material',
        spec_value: 'birch',
        is_verified: true,
      },
      {
        product_id: createdProducts[1],
        spec_key: 'water_resistant',
        spec_value: 'true',
        is_verified: true,
      },
    ]

    for (const spec of demoSpecs) {
      const { error: specError } = await supabase
        .from('product_specifications')
        .insert(spec as any)

      if (specError) {
        console.error('Spec insert error:', specError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data created',
      supplier_id: supplierId,
      product_ids: createdProducts,
      spec_count: demoSpecs.length,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
