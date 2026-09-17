import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { OrderItemInsert } from '@/lib/db'
import { logEvent, resolveCarpenter } from '@/lib/offer'
import { bestOffer, OFFER_COLUMNS, type Offer } from '@/lib/catalog'
import { notifyNewOrders } from '@/lib/notify-order'
import { getSessionCarpenter } from '@/lib/carpenter-auth'

/** One line as the checkout posts it. */
interface IncomingItem {
  id: string
  name_he: string
  name_en?: string | null
  base_price_excl_vat: number
  quantity: number
  /** The supplier the carpenter chose. Honoured when it still has a live offer. */
  supplier_id?: string
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
      supplier_id: typeof item.supplier_id === 'string' ? item.supplier_id : undefined,
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

    // An order coming from an offer link carries the token, never a
    // carpenter id: the token is the only thing the browser holds that is
    // worth believing.
    //
    // Without one — a carpenter who signed in on this device from an emailed
    // login link, so nothing was ever stored in the browser — the signed session
    // cookie identifies them instead. It is proof we minted ourselves.
    const session = body.token ? null : await getSessionCarpenter()
    const carpenter = body.token
      ? await resolveCarpenter(body.token)
      : session
        ? await resolveCarpenter(session.token)
        : null
    if (body.token && !carpenter) {
      return NextResponse.json({ error: 'Unknown link' }, { status: 404 })
    }

    // The purchasing app does not ask a signed-in carpentry to retype who it is:
    // what the request leaves out comes from the carpentry's own record.
    const customer_name = body.customer_name || carpenter?.contact_name || carpenter?.business_name
    const customer_email = body.customer_email || carpenter?.email
    const customer_phone = body.customer_phone || carpenter?.phone
    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: 'חסרים פרטי קשר — שם, טלפון ומייל' }, { status: 400 })
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
      .eq('supplier_offers.suppliers.status', 'approved')

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
      // The carpenter may have chosen another supplier than the suggested one.
      // That choice stands only while that supplier still has a live offer;
      // otherwise the catalogue's own rule decides, as it always did.
      const chosen = item.supplier_id
        ? product.supplier_offers.find((offer) => offer.supplier_id === item.supplier_id)
        : undefined
      const offer = chosen ?? bestOffer(product)
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

    // One cart, one purchase order per supplier. An order has a single status,
    // confirmed amount and supplier note, so it can only ever speak for one
    // company. Lines without a supplier cannot happen here — bestOffer found an
    // offer for every product above — but they would have nowhere to go.
    const bySupplier = new Map<string, typeof lines>()
    for (const line of lines) {
      if (!line.supplier_id) continue
      bySupplier.set(line.supplier_id, [...(bySupplier.get(line.supplier_id) ?? []), line])
    }

    // Each supplier's minimum order, and the payment terms the supplier set —
    // those are the terms of its purchase order, not something the carpenter
    // picks. A request that still sends terms (older screens) is used only
    // where the supplier has set none.
    const { data: supplierRows } = await supabase
      .from('suppliers')
      .select('id, company_name, min_order_value_excl_vat, payment_terms')
      .in('id', [...bySupplier.keys()])
    const supplierById = new Map((supplierRows ?? []).map((row) => [row.id, row]))

    for (const [supplierId, supplierLines] of bySupplier) {
      const supplier = supplierById.get(supplierId)
      const min = supplier?.min_order_value_excl_vat == null ? 0 : Number(supplier.min_order_value_excl_vat)
      const subtotal = supplierLines.reduce((sum, line) => sum + line.line_total_excl_vat, 0)
      if (min > 0 && subtotal < min) {
        const missing = (min - subtotal).toLocaleString('he-IL', { maximumFractionDigits: 2 })
        return NextResponse.json(
          { error: `חסר ₪${missing} למינימום ההזמנה אצל ${supplier?.company_name ?? 'הספק'}`, code: 'below_minimum', supplierId },
          { status: 409 }
        )
      }
    }

    const checkoutId = crypto.randomUUID()
    const stamp = Date.now()
    const groups = [...bySupplier].map(([supplierId, supplierLines], index) => {
      const subtotal = Number(
        supplierLines.reduce((sum, line) => sum + line.line_total_excl_vat, 0).toFixed(2)
      )
      return {
        supplierId,
        lines: supplierLines,
        subtotal,
        // Orders from one checkout share the number and differ by suffix, so a
        // carpenter reading "ORD-…-2" knows it went out with "ORD-…-1".
        orderNumber: bySupplier.size > 1 ? `ORD-${stamp}-${index + 1}` : `ORD-${stamp}`,
      }
    })

    const { data: created, error: orderError } = await supabase
      .from('orders')
      .insert(
        groups.map((group) => ({
          order_number: group.orderNumber,
          checkout_id: checkoutId,
          supplier_id: group.supplierId,
          customer_name,
          customer_email,
          customer_phone,
          business_name: body.business_name || null,
          address: body.address || null,
          city: body.city || null,
          zip_code: body.zip_code || null,
          payment_method: supplierById.get(group.supplierId)?.payment_terms?.length
            ? supplierById.get(group.supplierId)!.payment_terms.join(' / ')
            : body.payment_method || null,
          notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 600) : null,
          carpenter_id: carpenter?.id ?? null,
          campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
          subtotal_excl_vat: group.subtotal,
          vat_rate: VAT_RATE,
          total_amount: Number((group.subtotal * (1 + VAT_RATE)).toFixed(2)),
          status: 'pending',
        }))
      )
      .select('id, order_number, short_number, supplier_id')

    if (orderError || !created || created.length !== groups.length) {
      await supabase.from('orders').delete().eq('checkout_id', checkoutId)
      return NextResponse.json(
        { error: orderError?.message ?? 'Failed to create order' },
        { status: 500 }
      )
    }

    const orderBySupplier = new Map(created.map((order) => [order.supplier_id, order]))
    const orderItems: OrderItemInsert[] = groups.flatMap((group) =>
      group.lines.map((line) => ({ ...line, order_id: orderBySupplier.get(group.supplierId)!.id }))
    )

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      // Postgres has no transaction across two PostgREST calls, so orders
      // without lines have to be cleaned up by hand rather than left orphaned.
      await supabase.from('orders').delete().eq('checkout_id', checkoutId)
      return NextResponse.json(
        { error: `Failed to save order lines: ${itemsError.message}` },
        { status: 500 }
      )
    }

    // Awaited rather than fired and forgotten: a serverless function that
    // returns can be frozen mid-request, and a notification that vanishes
    // sometimes is worse than one that never existed. It swallows its own
    // failures, so it cannot fail the order.
    await notifyNewOrders(created.map((order) => order.id))

    const subtotalExclVat = Number(groups.reduce((sum, group) => sum + group.subtotal, 0).toFixed(2))
    const totalInclVat = Number((subtotalExclVat * (1 + VAT_RATE)).toFixed(2))

    if (carpenter) {
      await logEvent('order_sent', {
        carpenter_id: carpenter.id,
        campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
        product_id: lines[0]?.product_id ?? null,
        metadata: { lines: lines.length, suppliers: groups.length, subtotal_excl_vat: subtotalExclVat, checkout_id: checkoutId },
      })
    }

    const orders = groups.map((group) => {
      const order = orderBySupplier.get(group.supplierId)!
      return {
        id: order.id,
        orderNumber: order.order_number,
        shortNumber: order.short_number,
        supplierId: group.supplierId,
        supplierName: supplierById.get(group.supplierId)?.company_name ?? null,
        subtotalExclVat: group.subtotal,
      }
    })

    return NextResponse.json(
      {
        success: true,
        checkoutId,
        orders,
        // The first order, for callers that only know about one.
        orderId: orders[0].id,
        orderNumber: orders.map((order) => order.orderNumber).join(', '),
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
    // Or, with no token in this browser, the signed session cookie from an
    // emailed login link — the same proof the POST above accepts.
    const token = searchParams.get('token')
    const session = token ? null : await getSessionCarpenter()
    const carpenter = token
      ? await resolveCarpenter(token)
      : session
        ? await resolveCarpenter(session.token)
        : null

    if (!carpenter) {
      return NextResponse.json({ orders: [], total: 0, limit, offset })
    }

    const { data, error, count } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*), suppliers(company_name, phone)', { count: 'exact' })
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
