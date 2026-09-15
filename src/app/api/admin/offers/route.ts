import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function trimmed(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, max) : null
}

/**
 * Attach another supplier's price to an existing product.
 *
 * This is what makes one product comparable across suppliers: the same Cleaner
 * sold by two companies is one product with two offers, not two products that
 * happen to share a name. The carpenter sees it once, with the best price.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const productId = trimmed(body.product_id, 64)
    const supplierId = trimmed(body.supplier_id, 64)
    if (!productId || !supplierId) {
      return NextResponse.json({ error: 'צריך מוצר וספק' }, { status: 400 })
    }

    const price = Number(body.price_excl_vat)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'צריך מחיר גדול מאפס' }, { status: 400 })
    }

    const stock = body.stock_qty === undefined || body.stock_qty === '' ? 0 : Number(body.stock_qty)
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: 'מלאי לא תקין' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const [{ data: supplier }, { data: product }] = await Promise.all([
      supabase.from('suppliers').select('status').eq('id', supplierId).maybeSingle(),
      supabase.from('products').select('id').eq('id', productId).maybeSingle(),
    ])

    if (!product) return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 })
    if (!supplier) return NextResponse.json({ error: 'הספק לא נמצא' }, { status: 404 })
    if (supplier.status !== 'approved') {
      return NextResponse.json({ error: 'אפשר לקשר רק ספק מאושר' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('supplier_offers')
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        price_excl_vat: price,
        stock_qty: stock,
        supplier_sku: trimmed(body.supplier_sku),
        is_active: true,
        source: 'manual',
      })
      .select('id')
      .single()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        {
          error: duplicate
            ? 'הספק הזה כבר מוכר את המוצר, או שהמק״ט כבר קיים אצלו על מוצר אחר'
            : error.message,
        },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true, offer_id: data.id }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Merge: move one supplier's price onto another product.
 *
 * For the duplicate that happens when a second supplier lists something that
 * already exists under a slightly different name. The offer moves to the right
 * product; the product it leaves behind goes if nobody else sells it (or is
 * switched off if an old order still points at it).
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const offerId = trimmed(body.offer_id, 64)
    const targetId = trimmed(body.product_id, 64)
    if (!offerId || !targetId) {
      return NextResponse.json({ error: 'צריך הצעה ומוצר יעד' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: offer } = await supabase
      .from('supplier_offers')
      .select('id, product_id, supplier_id')
      .eq('id', offerId)
      .maybeSingle()

    if (!offer) return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 })
    if (offer.product_id === targetId) {
      return NextResponse.json({ error: 'ההצעה כבר נמצאת על המוצר הזה' }, { status: 400 })
    }

    const [{ data: target }, { data: clash }] = await Promise.all([
      supabase.from('products').select('id').eq('id', targetId).maybeSingle(),
      supabase
        .from('supplier_offers')
        .select('id')
        .eq('product_id', targetId)
        .eq('supplier_id', offer.supplier_id)
        .maybeSingle(),
    ])

    if (!target) return NextResponse.json({ error: 'מוצר היעד לא נמצא' }, { status: 404 })
    if (clash) {
      return NextResponse.json(
        { error: 'לספק הזה כבר יש מחיר על מוצר היעד. מחק את אחד מהם קודם.' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('supplier_offers')
      .update({ product_id: targetId, updated_at: new Date().toISOString() })
      .eq('id', offerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { count } = await supabase
      .from('supplier_offers')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', offer.product_id)

    if ((count ?? 0) === 0) {
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', offer.product_id)
      if (productError) {
        await supabase
          .from('products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', offer.product_id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
