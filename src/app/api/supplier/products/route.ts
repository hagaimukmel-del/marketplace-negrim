import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { BASE_UNITS, type BaseUnit } from '@/lib/catalog'
import type { Database } from '@/lib/database.types'
import { thresholdChange } from '@/lib/quote-rules'
import { loadOfferForThreshold } from '@/lib/special-price'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type OfferInsert = Database['public']['Tables']['supplier_offers']['Insert']
type OfferUpdate = Database['public']['Tables']['supplier_offers']['Update']

const IMAGE_BUCKET = 'product-images'
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function isBaseUnit(value: unknown): value is BaseUnit {
  return typeof value === 'string' && value in BASE_UNITS
}

/** A LIKE pattern that matches the text literally, underscores included. */
function literal(value: string): string {
  return value.replace(/[\\%_]/g, (char: string) => `\\${char}`)
}

interface OfferFields {
  price?: number
  stock?: number
  sku?: string | null
  packLabel?: string | null
  packQty?: number | null
  minOrderQty?: number
}

/** Validate the fields that belong to a supplier's own offer. */
function readOfferFields(body: Record<string, unknown>, requirePrice: boolean): OfferFields | string {
  const fields: OfferFields = {}

  if (body.price_excl_vat !== undefined || requirePrice) {
    const price = Number(body.price_excl_vat)
    if (!Number.isFinite(price) || price <= 0) return 'צריך מחיר גדול מאפס'
    fields.price = price
  }

  if (body.stock_qty !== undefined && body.stock_qty !== '') {
    const stock = Number(body.stock_qty)
    if (!Number.isInteger(stock) || stock < 0) return 'מלאי לא תקין'
    fields.stock = stock
  }

  if (typeof body.supplier_sku === 'string') fields.sku = text(body.supplier_sku, 80)
  if (typeof body.pack_label === 'string') fields.packLabel = text(body.pack_label, 40)

  if (body.pack_qty !== undefined) {
    if (body.pack_qty === '' || body.pack_qty === null) {
      fields.packQty = null
    } else {
      const packQty = Number(body.pack_qty)
      if (!Number.isFinite(packQty) || packQty <= 0) return 'כמות באריזה לא תקינה'
      fields.packQty = packQty
    }
  }

  if (body.min_order_qty !== undefined && body.min_order_qty !== '') {
    const minQty = Number(body.min_order_qty)
    if (!Number.isFinite(minQty) || minQty <= 0) return 'כמות מינימום לא תקינה'
    fields.minOrderQty = minQty
  }

  return fields
}

/**
 * The special-price threshold on a new offer (stage 1 RFQ rules), checked
 * against the pack and minimum order sent with it. Nothing is added to the row
 * when no threshold is given, so a database without the columns still works.
 */
function newOfferThreshold(body: Record<string, unknown>, fields: OfferFields) {
  return thresholdChange(body, { packQty: fields.packQty ?? null, minOrderQty: fields.minOrderQty ?? 1, threshold: null }, {})
}

/**
 * A supplier adds a product.
 *
 * The product and the offer are two rows. The product is what the item is and
 * is shared by everyone who sells it; the offer is this supplier's price. When
 * the supplier gives a brand and a manufacturer part number that another
 * supplier already listed, no duplicate is created — their price is attached to
 * the existing product, which is exactly what makes two suppliers comparable.
 */
export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const body = (await request.json()) as Record<string, unknown>
    const supabase = getSupabaseAdmin()

    // ---- "I sell this too": a price on a product that already exists ----
    // The supplier picked it from the catalogue, so nothing about the product
    // is taken from the request — only their own price, stock and pack.
    if (typeof body.product_id === 'string') {
      const offerFields = readOfferFields(body, true)
      if (typeof offerFields === 'string') {
        return NextResponse.json({ error: offerFields }, { status: 400 })
      }
      const threshold = newOfferThreshold(body, offerFields)
      if (!threshold.ok) return NextResponse.json({ error: threshold.error, code: threshold.code }, { status: threshold.status })

      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', body.product_id)
        .eq('is_active', true)
        .maybeSingle()
      if (!product) return NextResponse.json({ error: 'המוצר לא נמצא בקטלוג' }, { status: 404 })

      const { data: offer, error } = await supabase
        .from('supplier_offers')
        .insert({
          product_id: product.id,
          supplier_id: supplier.id,
          price_excl_vat: offerFields.price as number,
          stock_qty: offerFields.stock ?? 0,
          supplier_sku: offerFields.sku ?? null,
          pack_label: offerFields.packLabel ?? null,
          pack_qty: offerFields.packQty ?? null,
          min_order_qty: offerFields.minOrderQty ?? 1,
          is_active: true,
          source: 'manual',
          ...(threshold.fields ?? {}),
        })
        .select('id')
        .single()

      if (error) {
        const duplicate = error.code === '23505'
        return NextResponse.json(
          {
            error: duplicate
              ? 'המוצר הזה כבר נמצא ברשימה שלך (אם מחקת אותו, הוא ברשימת "נמחקו" ואפשר להחזיר אותו משם), או שהמק״ט כבר קיים אצלך'
              : error.message,
          },
          { status: duplicate ? 409 : 500 }
        )
      }

      return NextResponse.json(
        { ok: true, offer_id: offer.id, product_id: product.id, merged: true },
        { status: 201 }
      )
    }

    const name = text(body.name_he, 160)
    if (!name) return NextResponse.json({ error: 'צריך שם מוצר' }, { status: 400 })

    const baseUnit = isBaseUnit(body.base_unit) ? body.base_unit : 'unit'
    const offerFields = readOfferFields(body, true)
    if (typeof offerFields === 'string') {
      return NextResponse.json({ error: offerFields }, { status: 400 })
    }
    const threshold = newOfferThreshold(body, offerFields)
    if (!threshold.ok) return NextResponse.json({ error: threshold.error, code: threshold.code }, { status: threshold.status })

    const brand = text(body.brand, 80)
    const mpn = text(body.mpn, 80)

    const productRow: ProductInsert = {
      name_he: name,
      name_en: text(body.name_en, 160) ?? name,
      description_he: text(body.description_he, 1000),
      category_id: text(body.category_id, 64),
      brand,
      mpn,
      base_unit: baseUnit,
      is_active: true,
      created_by_supplier_id: supplier.id,
    }

    let productId: string
    let createdHere = true

    const { data: created, error: productError } = await supabase
      .from('products')
      .insert(productRow)
      .select('id')
      .single()

    if (productError) {
      // Brand + part number already listed by somebody: attach to it.
      if (productError.code === '23505' && brand && mpn) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .ilike('brand', literal(brand))
          .ilike('mpn', literal(mpn))
          .limit(1)
          .maybeSingle()
        if (!existing) {
          return NextResponse.json({ error: productError.message }, { status: 500 })
        }
        productId = existing.id
        createdHere = false
      } else {
        return NextResponse.json({ error: productError.message }, { status: 500 })
      }
    } else {
      productId = created.id
    }

    const offerRow: OfferInsert = {
      product_id: productId,
      supplier_id: supplier.id,
      price_excl_vat: offerFields.price as number,
      stock_qty: offerFields.stock ?? 0,
      supplier_sku: offerFields.sku ?? null,
      pack_label: offerFields.packLabel ?? null,
      pack_qty: offerFields.packQty ?? null,
      min_order_qty: offerFields.minOrderQty ?? 1,
      is_active: true,
      source: 'manual',
      ...(threshold.fields ?? {}),
    }

    const { data: offer, error: offerError } = await supabase
      .from('supplier_offers')
      .insert(offerRow)
      .select('id')
      .single()

    if (offerError) {
      // A product nobody can buy is worse than none: undo what this call made.
      if (createdHere) await supabase.from('products').delete().eq('id', productId)
      const duplicate = offerError.code === '23505'
      return NextResponse.json(
        {
          error: duplicate
            ? createdHere
              ? 'המק״ט הזה כבר קיים אצלך על מוצר אחר'
              : 'המוצר הזה כבר קיים אצלך — עדכן את המחיר שלו ברשימה'
            : offerError.message,
        },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json(
      { ok: true, offer_id: offer.id, product_id: productId, merged: !createdHere },
      { status: 201 }
    )
  } catch (err) {
    console.error('Supplier product create failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Edit a product, or give it a photo.
 *
 * Offer fields — price, stock, pack, the supplier's own catalogue number — are
 * always the supplier's. Shared fields — name, category, unit, photo — only if
 * this supplier created the product; otherwise one supplier renaming it would
 * rename it for everyone who sells it.
 */
export async function PATCH(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const supabase = getSupabaseAdmin()
    const contentType = request.headers.get('content-type') ?? ''

    const loadOwned = async (offerId: string) => {
      const { data } = await supabase
        .from('supplier_offers')
        .select('id, product_id, products(created_by_supplier_id)')
        .eq('id', offerId)
        .eq('supplier_id', supplier.id)
        .maybeSingle()
      if (!data) return null
      const product = data.products as { created_by_supplier_id: string | null } | null
      return {
        productId: data.product_id,
        ownsProduct: product?.created_by_supplier_id === supplier.id,
      }
    }

    // ---- photo ----------------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const offerId = form.get('offer_id')
      const file = form.get('file')

      if (typeof offerId !== 'string' || !(file instanceof File)) {
        return NextResponse.json({ error: 'חסר מוצר או קובץ' }, { status: 400 })
      }
      if (!IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'קובץ תמונה בלבד (JPG, PNG, WEBP)' }, { status: 415 })
      }
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json({ error: 'התמונה גדולה מ-5MB' }, { status: 413 })
      }

      const owned = await loadOwned(offerId)
      if (!owned) return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 })
      if (!owned.ownsProduct) {
        return NextResponse.json(
          { error: 'התמונה של המוצר הזה משותפת לספקים נוספים ולא ניתנת להחלפה' },
          { status: 403 }
        )
      }

      const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
      const path = `${owned.productId}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)

      const { error } = await supabase
        .from('products')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', owned.productId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ ok: true, image_url: publicUrl })
    }

    // ---- fields -----------------------------------------------------------
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.offer_id !== 'string') {
      return NextResponse.json({ error: 'חסר מוצר' }, { status: 400 })
    }

    const owned = await loadOwned(body.offer_id)
    if (!owned) return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 })

    // ---- restore from "נמחקו": back as it was, listed or hidden -------------
    if (body.restore === true) {
      const { data: marked, error: readError } = await supabase
        .from('supplier_offers')
        .select('deleted_at, active_before_delete')
        .eq('id', body.offer_id)
        .eq('supplier_id', supplier.id)
        .maybeSingle()
      if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
      if (!marked?.deleted_at) return NextResponse.json({ ok: true, restored: false })
      const { error } = await supabase
        .from('supplier_offers')
        .update({
          deleted_at: null,
          active_before_delete: null,
          is_active: marked.active_before_delete ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.offer_id)
        .eq('supplier_id', supplier.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, restored: true, is_active: marked.active_before_delete ?? true })
    }

    const offerFields = readOfferFields(body, false)
    if (typeof offerFields === 'string') {
      return NextResponse.json({ error: offerFields }, { status: 400 })
    }

    // The threshold is checked against the pack and minimum as they will be
    // after this save, before anything is written.
    let thresholdFields: OfferUpdate | null = null
    if ('special_price_min_qty' in body || offerFields.packQty !== undefined || offerFields.minOrderQty !== undefined) {
      const current = await loadOfferForThreshold(body.offer_id, supplier.id)
      if (!current) return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 })
      const change = thresholdChange(body, current, { packQty: offerFields.packQty, minOrderQty: offerFields.minOrderQty })
      if (!change.ok) return NextResponse.json({ error: change.error, code: change.code }, { status: change.status })
      thresholdFields = change.fields
    }

    const offer: OfferUpdate = { updated_at: new Date().toISOString(), ...(thresholdFields ?? {}) }
    if (offerFields.price !== undefined) offer.price_excl_vat = offerFields.price
    if (offerFields.stock !== undefined) offer.stock_qty = offerFields.stock
    if (offerFields.sku !== undefined) offer.supplier_sku = offerFields.sku
    if (offerFields.packLabel !== undefined) offer.pack_label = offerFields.packLabel
    if (offerFields.packQty !== undefined) offer.pack_qty = offerFields.packQty
    if (offerFields.minOrderQty !== undefined) offer.min_order_qty = offerFields.minOrderQty
    if (typeof body.is_active === 'boolean') offer.is_active = body.is_active

    const productKeys = ['name_he', 'name_en', 'description_he', 'category_id', 'brand', 'mpn', 'base_unit']
    const touchesProduct = productKeys.some((key) => key in body)

    if (touchesProduct && owned.ownsProduct) {
      const product: ProductUpdate = { updated_at: new Date().toISOString() }
      if ('name_he' in body) {
        const name = text(body.name_he, 160)
        if (!name) return NextResponse.json({ error: 'צריך שם מוצר' }, { status: 400 })
        product.name_he = name
      }
      if ('name_en' in body) product.name_en = text(body.name_en, 160)
      if ('description_he' in body) product.description_he = text(body.description_he, 1000)
      if ('category_id' in body) product.category_id = text(body.category_id, 64)
      if ('brand' in body) product.brand = text(body.brand, 80)
      if ('mpn' in body) product.mpn = text(body.mpn, 80)
      if ('base_unit' in body) {
        if (!isBaseUnit(body.base_unit)) {
          return NextResponse.json({ error: 'יחידת מידה לא מוכרת' }, { status: 400 })
        }
        product.base_unit = body.base_unit
      }

      const { error } = await supabase.from('products').update(product).eq('id', owned.productId)
      if (error) {
        const duplicate = error.code === '23505'
        return NextResponse.json(
          { error: duplicate ? 'מוצר עם אותו מותג ומק״ט יצרן כבר קיים בקטלוג' : error.message },
          { status: duplicate ? 409 : 500 }
        )
      }
    }

    const { error } = await supabase
      .from('supplier_offers')
      .update(offer)
      .eq('id', body.offer_id)
      .eq('supplier_id', supplier.id)

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'המק״ט הזה כבר קיים אצלך על מוצר אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Supplier product update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/** The column is missing on a database without migration 20261026190000. */
function missingColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204' || /deleted_at|active_before_delete/.test(error.message ?? '')))
}

/**
 * Stop selling a product.
 *
 * The first delete only moves it to the supplier's "נמחקו" list: the offer is
 * marked and switched off, so nobody can see or order it, and one click brings
 * it back (PATCH with `restore`). `permanent=1` on an offer already in that
 * list removes it for good: the offer goes, and the product goes with it only
 * if this supplier created it and nobody else sells it — and if an old order
 * still points at it, it is switched off instead, so that order keeps resolving.
 */
export async function DELETE(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const offerId = request.nextUrl.searchParams.get('offer_id')
    if (!offerId) return NextResponse.json({ error: 'חסר מוצר' }, { status: 400 })
    const permanent = request.nextUrl.searchParams.get('permanent') === '1'

    const supabase = getSupabaseAdmin()
    const { data: offer } = await supabase
      .from('supplier_offers')
      .select('id, product_id, is_active, products(created_by_supplier_id)')
      .eq('id', offerId)
      .eq('supplier_id', supplier.id)
      .maybeSingle()

    if (!offer) return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 })

    if (!permanent) {
      const { error } = await supabase
        .from('supplier_offers')
        .update({
          deleted_at: new Date().toISOString(),
          active_before_delete: offer.is_active,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('supplier_id', supplier.id)
      if (!error) return NextResponse.json({ ok: true, deleted: true })
      if (!missingColumn(error)) return NextResponse.json({ error: error.message }, { status: 500 })
      // Before the migration there is no "נמחקו" list: hide it, which is undoable too.
      const { error: hideError } = await supabase
        .from('supplier_offers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', offerId)
        .eq('supplier_id', supplier.id)
      if (hideError) return NextResponse.json({ error: hideError.message }, { status: 500 })
      return NextResponse.json({ ok: true, hidden: true })
    }

    const { data: marked } = await supabase
      .from('supplier_offers')
      .select('deleted_at')
      .eq('id', offerId)
      .eq('supplier_id', supplier.id)
      .maybeSingle()
    if (!marked?.deleted_at) {
      return NextResponse.json({ error: 'אפשר למחוק לצמיתות רק מוצר שנמצא ברשימת "נמחקו"' }, { status: 409 })
    }

    const { error } = await supabase
      .from('supplier_offers')
      .delete()
      .eq('id', offerId)
      .eq('supplier_id', supplier.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const product = offer.products as { created_by_supplier_id: string | null } | null
    if (product?.created_by_supplier_id === supplier.id) {
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
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
