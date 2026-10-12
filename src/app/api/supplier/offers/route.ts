import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import type { Database } from '@/lib/database.types'
import { thresholdChange } from '@/lib/quote-rules'
import { loadOfferForThreshold } from '@/lib/special-price'

type OfferUpdate = Database['public']['Tables']['supplier_offers']['Update']

/**
 * A supplier changes their own price, stock, pack or special-price threshold.
 *
 * Which supplier is never taken from the request. The id comes from the signed
 * cookie, and the update is filtered on it as well as on the offer id — so a
 * supplier who guesses another company's offer id changes nothing, rather than
 * changing somebody else's price.
 *
 * Only the offer is editable here. The product — its name, brand, part number,
 * unit — is shared by every supplier who carries it, so one supplier renaming
 * it would rename it for all of them. That belongs to the catalogue, not to
 * whoever happens to be editing.
 */
export async function PATCH(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused
  const supplierId = supplier.id

  try {
    const body = await request.json()
    if (typeof body.offer_id !== 'string') {
      return NextResponse.json({ error: 'חסר מזהה הצעה' }, { status: 400 })
    }

    const update: OfferUpdate = { updated_at: new Date().toISOString() }

    if (body.price_excl_vat !== undefined) {
      const price = Number(body.price_excl_vat)
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
      }
      update.price_excl_vat = price
    }

    if (body.stock_qty !== undefined) {
      const stock = Number(body.stock_qty)
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: 'מלאי לא תקין' }, { status: 400 })
      }
      update.stock_qty = stock
    }

    if (typeof body.supplier_sku === 'string') {
      update.supplier_sku = body.supplier_sku.trim() || null
    }

    if (typeof body.pack_label === 'string') {
      update.pack_label = body.pack_label.trim() || null
    }

    if (body.pack_qty !== undefined) {
      if (body.pack_qty === '' || body.pack_qty === null) {
        update.pack_qty = null
      } else {
        const packQty = Number(body.pack_qty)
        if (!Number.isFinite(packQty) || packQty <= 0) {
          return NextResponse.json({ error: 'כמות באריזה לא תקינה' }, { status: 400 })
        }
        update.pack_qty = packQty
      }
    }

    if (typeof body.is_active === 'boolean') update.is_active = body.is_active

    // A pack change under a special-price threshold needs the threshold
    // confirmed in the same save (stage 1 RFQ rules).
    if ('special_price_min_qty' in body || update.pack_qty !== undefined) {
      const current = await loadOfferForThreshold(body.offer_id, supplierId)
      if (!current) return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 })
      const change = thresholdChange(body, current, { packQty: update.pack_qty })
      if (!change.ok) return NextResponse.json({ error: change.error, code: change.code }, { status: change.status })
      if (change.fields) Object.assign(update, change.fields)
    }

    const { data, error } = await getSupabaseAdmin()
      .from('supplier_offers')
      .update(update)
      .eq('id', body.offer_id)
      // The second half of the guard. Without it, an id from somewhere else
      // would be enough.
      .eq('supplier_id', supplierId)
      .select('id')
      .maybeSingle()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'מק״ט כבר קיים אצלך על מוצר אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Supplier offer update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

const MAX_BULK = 500

/**
 * Quick edit: many prices, stock counts or show/hide switches saved at once.
 *
 * Body: `{ changes: [{ offer_id, price_excl_vat?, stock_qty?, is_active? }] }`.
 * Everything is checked before anything is written, so one bad price refuses
 * the whole save and the table keeps what was typed. Each row is filtered on
 * the session's supplier, like the single edit above.
 */
export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  try {
    const body = (await request.json()) as { changes?: unknown }
    if (!Array.isArray(body.changes) || body.changes.length === 0) {
      return NextResponse.json({ error: 'אין שינויים לשמור' }, { status: 400 })
    }
    if (body.changes.length > MAX_BULK) {
      return NextResponse.json({ error: `אפשר לשמור עד ${MAX_BULK} שורות בבת אחת` }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updates: { id: string; update: OfferUpdate }[] = []
    for (const raw of body.changes as Record<string, unknown>[]) {
      if (!raw || typeof raw.offer_id !== 'string') {
        return NextResponse.json({ error: 'חסר מזהה הצעה' }, { status: 400 })
      }
      const update: OfferUpdate = { updated_at: now }
      if (raw.price_excl_vat !== undefined) {
        const price = Number(raw.price_excl_vat)
        if (!Number.isFinite(price) || price <= 0) {
          return NextResponse.json({ error: 'מחיר לא תקין', offer_id: raw.offer_id }, { status: 400 })
        }
        update.price_excl_vat = Math.round(price * 100) / 100
      }
      if (raw.stock_qty !== undefined) {
        const stock = Number(raw.stock_qty)
        if (!Number.isInteger(stock) || stock < 0) {
          return NextResponse.json({ error: 'מלאי לא תקין', offer_id: raw.offer_id }, { status: 400 })
        }
        update.stock_qty = stock
      }
      if (typeof raw.is_active === 'boolean') update.is_active = raw.is_active
      if (Object.keys(update).length > 1) updates.push({ id: raw.offer_id, update })
    }

    const supabase = getSupabaseAdmin()
    let saved = 0
    const failed: string[] = []
    for (let i = 0; i < updates.length; i += 20) {
      const results = await Promise.all(
        updates.slice(i, i + 20).map(({ id, update }) =>
          supabase.from('supplier_offers').update(update).eq('id', id).eq('supplier_id', supplier.id).select('id').maybeSingle()
        )
      )
      results.forEach(({ data, error }, index) => {
        if (error || !data) failed.push(updates[i + index].id)
        else saved += 1
      })
    }

    if (failed.length > 0) console.error(`Bulk offer update: ${failed.length} rows not saved`)
    return NextResponse.json({ ok: failed.length === 0, saved, failed }, { status: failed.length && !saved ? 500 : 200 })
  } catch (err) {
    console.error('Supplier bulk offer update failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
