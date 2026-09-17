import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { unitLabel } from '@/lib/catalog'
import type { AppOrder, OrderStatus } from './orders'

const ORDER_COLUMNS =
  'id, short_number, order_number, status, created_at, confirmed_at, processing_at, shipped_at, delivered_at, ' +
  'subtotal_excl_vat, confirmed_subtotal_excl_vat, supplier_note, carpenter_seen_at, checkout_id, address, city, notes, ' +
  'suppliers(id, company_name, phone, payment_terms, default_lead_time_days, min_order_value_excl_vat), ' +
  'order_items(product_id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, supplier_id, products(base_unit))'

interface OrderRow {
  id: string
  short_number: number
  order_number: string
  status: string | null
  created_at: string | null
  confirmed_at: string | null
  processing_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  subtotal_excl_vat: number
  confirmed_subtotal_excl_vat: number | null
  supplier_note: string | null
  carpenter_seen_at: string | null
  checkout_id: string | null
  address: string | null
  city: string | null
  notes: string | null
  suppliers: {
    id: string
    company_name: string
    phone: string | null
    payment_terms: string[] | null
    default_lead_time_days: number | null
    min_order_value_excl_vat: number | null
  } | null
  order_items: {
    product_id: string | null
    product_name_he: string
    quantity: number
    unit_price_excl_vat: number
    line_total_excl_vat: number
    supplier_id: string | null
    products: { base_unit: string } | null
  }[]
}

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

/**
 * A carpenter's orders, newest first — or one of them, when `orderId` is given.
 * Scoped to the carpenter in the query itself: an id alone never reads an order.
 *
 * Pack sizes come from the supplier's current offer, only to say "2 × שק 25 ק״ג"
 * instead of "50 ק״ג"; every amount is the snapshot stored on the order.
 */
export async function loadCarpenterOrders(carpenterId: string, orderId?: string): Promise<AppOrder[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('carpenter_id', carpenterId)
    .order('created_at', { ascending: false })
    .limit(orderId ? 1 : 200)
  if (orderId) query = query.eq('id', orderId)

  const { data } = await query
  const rows = (data ?? []) as unknown as OrderRow[]
  if (rows.length === 0) return []

  const productIds = [...new Set(rows.flatMap((row) => row.order_items.map((line) => line.product_id)).filter(Boolean))] as string[]
  const { data: offers } = productIds.length
    ? await supabase.from('supplier_offers').select('product_id, supplier_id, pack_label, pack_qty').in('product_id', productIds)
    : { data: [] as { product_id: string; supplier_id: string; pack_label: string | null; pack_qty: number | null }[] }
  const packOf = new Map((offers ?? []).map((offer) => [`${offer.product_id}:${offer.supplier_id}`, offer]))

  return rows.map((row) => ({
    id: row.id,
    shortNumber: row.short_number,
    orderNumber: row.order_number,
    status: (STATUSES as string[]).includes(row.status ?? '') ? (row.status as OrderStatus) : 'pending',
    createdAt: row.created_at ?? new Date(0).toISOString(),
    confirmedAt: row.confirmed_at,
    processingAt: row.processing_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    submitted: Number(row.subtotal_excl_vat),
    confirmed: row.confirmed_subtotal_excl_vat == null ? null : Number(row.confirmed_subtotal_excl_vat),
    supplierNote: row.supplier_note,
    carpenterSeenAt: row.carpenter_seen_at,
    checkoutId: row.checkout_id,
    address: [row.address, row.city].filter(Boolean).join(', ') || null,
    notes: row.notes,
    supplier: row.suppliers
      ? {
          id: row.suppliers.id,
          name: row.suppliers.company_name,
          phone: row.suppliers.phone,
          terms: row.suppliers.payment_terms ?? [],
          leadDays: row.suppliers.default_lead_time_days,
          minOrder: row.suppliers.min_order_value_excl_vat == null ? null : Number(row.suppliers.min_order_value_excl_vat),
        }
      : null,
    lines: row.order_items.map((line) => {
      const pack = line.product_id && line.supplier_id ? packOf.get(`${line.product_id}:${line.supplier_id}`) : undefined
      return {
        productId: line.product_id,
        name: line.product_name_he,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unit_price_excl_vat),
        lineTotal: Number(line.line_total_excl_vat),
        unit: unitLabel(line.products?.base_unit),
        packLabel: pack?.pack_label ?? null,
        packQty: pack?.pack_qty == null ? null : Number(pack.pack_qty),
      }
    }),
  }))
}
