import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSupplierId } from '@/lib/supplier-auth'
import type { Database } from '@/lib/database.types'

type OfferUpdate = Database['public']['Tables']['supplier_offers']['Update']

/**
 * A supplier changes their own price, stock or pack.
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
  const supplierId = await getSupplierId()
  if (!supplierId) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }

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
