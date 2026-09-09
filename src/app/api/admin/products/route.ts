import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'

type ProductUpdate = Database['public']['Tables']['products']['Update']

const ITAMIR_SUPPLIER_ID = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'

const BUCKET = 'product-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Create a product by hand.
 *
 * Marked source = 'manual' so the sheet sync leaves it alone. The sync retires
 * anything the sheet no longer lists, which would otherwise switch this off the
 * moment it ran — a product you can add and then watch disappear is worse than
 * one you cannot add.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const nameHe = typeof body.name_he === 'string' ? body.name_he.trim() : ''
    if (!nameHe) {
      return NextResponse.json({ error: 'צריך שם מוצר בעברית' }, { status: 400 })
    }

    const price = Number(body.base_price_excl_vat)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'צריך מחיר גדול מאפס' }, { status: 400 })
    }

    const stock = body.stock_qty === undefined ? 0 : Number(body.stock_qty)
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: 'מלאי לא תקין' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('products')
      .insert({
        supplier_id: ITAMIR_SUPPLIER_ID,
        source: 'manual',
        sku: typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim() : null,
        name_he: nameHe,
        name_en:
          typeof body.name_en === 'string' && body.name_en.trim()
            ? body.name_en.trim()
            : nameHe,
        description_he:
          typeof body.description_he === 'string' && body.description_he.trim()
            ? body.description_he.trim()
            : null,
        category_id: typeof body.category_id === 'string' && body.category_id ? body.category_id : null,
        base_price_excl_vat: price,
        stock_qty: stock,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'מק״ט או שם זהה כבר קיימים' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Product create failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Edit one product, and upload its image.
 *
 * Images live in Supabase Storage rather than as a link in the sheet. Every
 * image_url in the catalogue is currently a Google Drive share link, which
 * Google refuses to serve to another origin - so 24 of 30 products show a grey
 * tile. A file uploaded here is served from the project's own storage and
 * simply works.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') ?? ''

    // ---- image upload -------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const id = form.get('id')
      const file = form.get('file')

      if (typeof id !== 'string' || !(file instanceof File)) {
        return NextResponse.json({ error: 'חסר מזהה מוצר או קובץ' }, { status: 400 })
      }
      if (!ALLOWED.includes(file.type)) {
        return NextResponse.json(
          { error: 'קובץ תמונה בלבד (JPG, PNG, WEBP)' },
          { status: 415 }
        )
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'הקובץ גדול מ-5MB' }, { status: 413 })
      }

      const supabase = getSupabaseAdmin()
      const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
      // The id in the path keeps one image per product; the timestamp busts
      // any CDN copy of the previous one.
      const path = `${id}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { error } = await supabase
        .from('products')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ ok: true, image_url: publicUrl })
    }

    // ---- field edit ---------------------------------------------------
    const body = await request.json()
    if (typeof body.id !== 'string') {
      return NextResponse.json({ error: 'חסר מזהה מוצר' }, { status: 400 })
    }

    const update: ProductUpdate = { updated_at: new Date().toISOString() }

    if (typeof body.sku === 'string') update.sku = body.sku.trim() || null
    if (typeof body.name_he === 'string' && body.name_he.trim()) {
      update.name_he = body.name_he.trim()
    }
    if (typeof body.name_en === 'string') update.name_en = body.name_en.trim() || null
    if (typeof body.description_he === 'string') {
      update.description_he = body.description_he.trim() || null
    }
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active

    if (body.base_price_excl_vat !== undefined) {
      const price = Number(body.base_price_excl_vat)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
      }
      update.base_price_excl_vat = price
    }

    if (body.stock_qty !== undefined) {
      const stock = Number(body.stock_qty)
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: 'מלאי לא תקין' }, { status: 400 })
      }
      update.stock_qty = stock
    }

    const { data, error } = await getSupabaseAdmin()
      .from('products')
      .update(update)
      .eq('id', body.id)
      .select('id, sku, name_he, name_en, base_price_excl_vat, stock_qty, is_active')
      .single()

    if (error) {
      // A duplicate SKU is a real answer, not a server fault: the supplier is
      // trying to give two products the same catalogue number.
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'מק״ט כבר קיים אצל מוצר אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true, product: data })
  } catch (err) {
    console.error('Product update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
