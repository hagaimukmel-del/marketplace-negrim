import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { OrderItemInsert } from '@/lib/db'
import { logEvent, resolveCarpenter } from '@/lib/offer'
import { bestOffer, OFFER_COLUMNS, type Offer } from '@/lib/catalog'

/** One line as the checkout posts it. */
interface IncomingItem {
  id: string
  name_he: string
  name_en?: string | null
  base_price_excl_vat: number
  quantity: number
}

const VAT_RATE = 0.18

function parseItems(raw: unknown): IncomingItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const items: IncomingItem[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null
    const item = entry as Record<string, unknown>

    const id = typeof item.id === 'string' ? item.id : null
    const nameHe = typeof item.name_he === 'string' ? item.name_he.trim() : ''
    const price = Number(item.base_price_excl_vat)
    const quantity = Number(item.quantity)

    if (!id || !nameHe) return null
    if (!Number.isFinite(price) || price < 0) return null
    if (!Number.isInteger(quantity) || quantity <= 0) return null

    items.push({
      id,
      name_he: nameHe,
      name_en: typeof item.name_en === 'string' ? item.name_en : null,
      base_price_excl_vat: price,
      quantity,
    })
  }
  return items
}

const CATALOG_OFFERS = `supplier_offers!inner(${OFFER_COLUMNS})`

interface OrderableProduct {
  id: string
  name_he: string
  name_en: string | null
  supplier_offers: Offer[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_name, customer_email, customer_phone } = body

    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // An order coming from an offer link carries the token, never a
    // carpenter id: the token is the only thing the browser holds that is
    // worth believing.
    const carpenter = body.token ? await resolveCarpenter(body.token) : null
    if (body.token && !carpenter) {
      return NextResponse.json({ error: 'Unknown link' }, { status: 404 })
    }

    const items = parseItems(body.items)
    if (!items) {
      return NextResponse.json(
        { error: 'items must be a non-empty array of { id, name_he, base_price_excl_vat, quantity }' },
        { status: 400 }
      )
    }

    // Prices come from the database, never from the request: the client could
    // otherwise name its own price. Only the quantities are taken on trust.
    const supabase = getSupabaseAdmin()
    const { data: products, error: productError } = await supabase
      .from('products')
      .select(`id, name_he, name_en, ${CATALOG_OFFERS}`)
      .in('id', items.map((item) => item.id))
      .eq('is_active', true)
      .eq('supplier_offers.is_active', true)

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    const byId = new Map(
      ((products ?? []) as unknown as OrderableProduct[]).map((product) => [product.id, product])
    )
    // No live offer means nobody sells it, which is the same to the carpenter
    // as the product being switched off.
    const missing = items.filter((item) => {
      const product = byId.get(item.id)
      return !product || !bestOffer(product)
    })
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Unavailable products: ${missing.map((m) => m.name_he).join(', ')}` },
        { status: 409 }
      )
    }

    // Amounts are snapshots. They are stored as calculated here and never
    // recomputed from the product row afterwards.
    // Which supplier is stamped on the line, not just which price: one cart
    // becomes one purchase order per supplier, and that split is only possible
    // if the line remembers who it was bought from.
    const lines = items.map((item) => {
      const product = byId.get(item.id)!
      const offer = bestOffer(product)
      const unitPrice = Number(offer?.price_excl_vat ?? 0)
      return {
        product_id: product.id,
        product_name_he: product.name_he,
        product_name_en: product.name_en,
        supplier_id: offer?.supplier_id ?? null,
        unit_price_excl_vat: unitPrice,
        quantity: item.quantity,
        line_total_excl_vat: Number((unitPrice * item.quantity).toFixed(2)),
      }
    })

    const subtotalExclVat = Number(
      lines.reduce((sum, line) => sum + line.line_total_excl_vat, 0).toFixed(2)
    )
    const totalInclVat = Number((subtotalExclVat * (1 + VAT_RATE)).toFixed(2))

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: `ORD-${Date.now()}`,
        customer_name,
        customer_email,
        customer_phone,
        business_name: body.business_name || null,
        address: body.address || null,
        city: body.city || null,
        zip_code: body.zip_code || null,
        payment_method: body.payment_method || null,
        carpenter_id: carpenter?.id ?? null,
        campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
        subtotal_excl_vat: subtotalExclVat,
        vat_rate: VAT_RATE,
        total_amount: totalInclVat,
        status: 'pending',
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message ?? 'Failed to create order' },
        { status: 500 }
      )
    }

    const orderItems: OrderItemInsert[] = lines.map((line) => ({
      ...line,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      // Postgres has no transaction across two PostgREST calls, so an order
      // without lines has to be cleaned up by hand rather than left orphaned.
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: `Failed to save order lines: ${itemsError.message}` },
        { status: 500 }
      )
    }

    if (carpenter) {
      await logEvent('order_sent', {
        carpenter_id: carpenter.id,
        campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
        product_id: lines[0]?.product_id ?? null,
        metadata: { lines: lines.length, subtotal_excl_vat: subtotalExclVat },
      })
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        subtotalExclVat,
        totalInclVat,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Order creation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // This used to return every order to any caller — one carpenter could read
    // another's name, phone and prices. A caller must now identify itself with
    // its token, and sees only its own orders.
    const token = searchParams.get('token')
    const carpenter = token ? await resolveCarpenter(token) : null

    if (!carpenter) {
      return NextResponse.json({ orders: [], total: 0, limit, offset })
    }

    const { data, error, count } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('carpenter_id', carpenter.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data, total: count, limit, offset })
  } catch (err) {
    console.error('Orders fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
