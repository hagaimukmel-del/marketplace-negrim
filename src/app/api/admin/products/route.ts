import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { BASE_UNITS, type BaseUnit } from '@/lib/catalog'
import type { Database } from '@/lib/database.types'

type ProductUpdate = Database['public']['Tables']['products']['Update']
type OfferUpdate = Database['public']['Tables']['supplier_offers']['Update']

const ITAMIR_SUPPLIER_ID = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'

const BUCKET = 'product-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

function isBaseUnit(value: unknown): value is BaseUnit {
  return typeof value === 'string' && value in BASE_UNITS
}

/**
 * Create a product and the offer that puts a price on it.
 *
 * Two rows, because they answer different questions: the product is what the
 * item is, and the offer is what one supplier charges. A product with no offer
 * is invisible to carpenters — nobody sells it — so both are written together
 * and the offer failing rolls the product back.
 *
 * The offer is marked source = 'manual' so the sheet sync leaves it alone. The
 * sync retires anything the sheet no longer lists, which would otherwise switch
 * this off the moment it ran.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const nameHe = trimmed(body.name_he)
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

    const baseUnit = isBaseUnit(body.base_unit) ? body.base_unit : 'unit'
    const supabase = getSupabaseAdmin()

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name_he: nameHe,
        name_en: trimmed(body.name_en) ?? nameHe,
        description_he: trimmed(body.description_he),
        category_id: trimmed(body.category_id),
        brand: trimmed(body.brand),
        mpn: trimmed(body.mpn),
        base_unit: baseUnit,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'כבר קיים מוצר עם אותו מותג ומק״ט יצרן' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    const { error: offerError } = await supabase.from('supplier_offers').insert({
      product_id: product.id,
      supplier_id: ITAMIR_SUPPLIER_ID,
      supplier_sku: trimmed(body.sku),
      price_excl_vat: price,
      stock_qty: stock,
      pack_label: trimmed(body.pack_label),
      pack_qty: body.pack_qty === undefined || body.pack_qty === '' ? null : Number(body.pack_qty),
      is_active: true,
      source: 'manual',
    })

    if (offerError) {
      // A product nobody can buy is worse than no product: undo it rather than
      // leaving an orphan behind for someone to find later.
      await supabase.from('products').delete().eq('id', product.id)
      const duplicate = offerError.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'מק״ט כבר קיים אצל מוצר אחר' : offerError.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true, id: product.id }, { status: 201 })
  } catch (err) {
    console.error('Product create failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Edit one product, its offer, or both — and upload its image.
 *
 * The screen presents a single row, so one save can touch either side. The
 * split happens here rather than in the client: what belongs to the product is
 * shared by every supplier that carries it, and what belongs to the offer is
 * one supplier's own.
 *
 * Images live in Supabase Storage rather than as a link in the sheet. Every
 * image_url in the catalogue is a Google Drive share link, which Google refuses
 * to serve to another origin — so those products show a grey tile. A file
 * uploaded here is served from the project's own storage and simply works.
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
        return NextResponse.json({ error: 'קובץ תמונה בלבד (JPG, PNG, WEBP)' }, { status: 415 })
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

    const supabase = getSupabaseAdmin()
    const offerId = typeof body.offer_id === 'string' ? body.offer_id : null

    // ---- what belongs to the product ----
    const product: ProductUpdate = {}

    if (typeof body.name_he === 'string' && body.name_he.trim()) {
      product.name_he = body.name_he.trim()
    }
    if (typeof body.name_en === 'string') product.name_en = trimmed(body.name_en)
    if (typeof body.name_ar === 'string') product.name_ar = trimmed(body.name_ar)
    if (typeof body.description_he === 'string') {
      product.description_he = trimmed(body.description_he)
    }
    if (typeof body.brand === 'string') product.brand = trimmed(body.brand)
    if (typeof body.mpn === 'string') product.mpn = trimmed(body.mpn)
    if (body.category_id !== undefined) product.category_id = trimmed(body.category_id)
    if (body.base_unit !== undefined) {
      if (!isBaseUnit(body.base_unit)) {
        return NextResponse.json({ error: 'יחידת מידה לא מוכרת' }, { status: 400 })
      }
      product.base_unit = body.base_unit
    }

    // ---- what belongs to the offer ----
    const offer: OfferUpdate = {}

    if (typeof body.sku === 'string') offer.supplier_sku = trimmed(body.sku)
    if (typeof body.pack_label === 'string') offer.pack_label = trimmed(body.pack_label)

    if (body.pack_qty !== undefined) {
      if (body.pack_qty === '' || body.pack_qty === null) {
        offer.pack_qty = null
      } else {
        const packQty = Number(body.pack_qty)
        if (!Number.isFinite(packQty) || packQty <= 0) {
          return NextResponse.json({ error: 'כמות באריזה לא תקינה' }, { status: 400 })
        }
        offer.pack_qty = packQty
      }
    }

    if (body.base_price_excl_vat !== undefined) {
      const price = Number(body.base_price_excl_vat)
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
      }
      offer.price_excl_vat = price
    }

    if (body.stock_qty !== undefined) {
      const stock = Number(body.stock_qty)
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: 'מלאי לא תקין' }, { status: 400 })
      }
      offer.stock_qty = stock
    }

    if (body.lead_time_days !== undefined) {
      if (body.lead_time_days === '' || body.lead_time_days === null) {
        offer.lead_time_days = null
      } else {
        const days = Number(body.lead_time_days)
        if (!Number.isInteger(days) || days < 0) {
          return NextResponse.json({ error: 'זמן אספקה לא תקין' }, { status: 400 })
        }
        offer.lead_time_days = days
      }
    }

    // Hiding is the supplier withdrawing their offer, not the product ceasing
    // to exist — another supplier may still carry it.
    if (typeof body.is_active === 'boolean') {
      if (offerId) offer.is_active = body.is_active
      else product.is_active = body.is_active
    }

    if (Object.keys(product).length > 0) {
      product.updated_at = new Date().toISOString()
      const { error } = await supabase.from('products').update(product).eq('id', body.id)
      if (error) {
        const duplicate = error.code === '23505'
        return NextResponse.json(
          { error: duplicate ? 'מותג ומק״ט יצרן כאלה כבר קיימים' : error.message },
          { status: duplicate ? 409 : 500 }
        )
      }
    }

    if (Object.keys(offer).length > 0) {
      if (!offerId) {
        return NextResponse.json(
          { error: 'למוצר הזה אין הצעת מחיר של ספק, אז אין מה לעדכן' },
          { status: 409 }
        )
      }
      offer.updated_at = new Date().toISOString()
      const { error } = await supabase.from('supplier_offers').update(offer).eq('id', offerId)
      if (error) {
        // A duplicate SKU is a real answer, not a server fault: the supplier is
        // trying to give two products the same catalogue number.
        const duplicate = error.code === '23505'
        return NextResponse.json(
          { error: duplicate ? 'מק״ט כבר קיים אצל מוצר אחר' : error.message },
          { status: duplicate ? 409 : 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, id: body.id })
  } catch (err) {
    console.error('Product update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Remove an offer, and the product with it when nothing is left.
 *
 * Only offers created here. A sheet-owned one would simply come back on the
 * next sync, so deleting it would look like a bug; those are switched off
 * instead, which also keeps them resolvable from old order lines.
 */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const offerId = request.nextUrl.searchParams.get('offer_id')
    if (!offerId) return NextResponse.json({ error: 'חסר מזהה הצעה' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: offer } = await supabase
      .from('supplier_offers')
      .select('id, product_id, source')
      .eq('id', offerId)
      .maybeSingle()

    if (!offer) {
      return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 })
    }
    if (offer.source !== 'manual') {
      return NextResponse.json(
        { error: 'מוצר מהגיליון לא נמחק — הוא יחזור בסנכרון הבא. אפשר להשבית אותו.' },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('supplier_offers').delete().eq('id', offerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // The product stays if anyone else sells it, or if an order line still
    // points at it — that line keeps its own name and price snapshot, but the
    // link has to survive.
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
        // Referenced by an order. Switching it off is the honest outcome.
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
