import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import SupplierConsole, { type ConsoleOffer, type ConsoleOrder } from './SupplierConsole'

export const dynamic = 'force-dynamic'

interface RawOffer {
  id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  is_active: boolean
  products: { name_he: string; base_unit: string } | null
}

interface RawLine {
  id: string
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
  orders: {
    id: string
    order_number: string
    status: string
    created_at: string
    business_name: string | null
    customer_name: string | null
    customer_phone: string | null
    address: string | null
    city: string | null
    payment_method: string | null
  } | null
}

/**
 * The supplier's own console.
 *
 * This is the screen that existed for weeks with nobody able to reach it: a
 * supplier could register, and be approved, and then do nothing at all. The
 * data was already here — it was being shown to the operator through
 * /admin/view/supplier — and what was missing was only the way in.
 *
 * Everything is scoped to the session's supplier, on the server. An order shows
 * only that supplier's own lines and their own subtotal, so nobody reads
 * another company's prices off a shared order.
 */
export default async function SupplierHome() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')

  const supabase = getSupabaseAdmin()

  const [{ data: offers }, { data: lines }] = await Promise.all([
    supabase
      .from('supplier_offers')
      .select(
        'id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, is_active, products(name_he, base_unit)'
      )
      .eq('supplier_id', supplier.id)
      .limit(500),
    supabase
      .from('order_items')
      .select(
        'id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, ' +
          'orders(id, order_number, status, created_at, business_name, customer_name, customer_phone, address, city, payment_method)'
      )
      .eq('supplier_id', supplier.id)
      .limit(500),
  ])

  const offerRows: ConsoleOffer[] = ((offers ?? []) as unknown as RawOffer[])
    .map((offer) => ({
      id: offer.id,
      productName: offer.products?.name_he ?? '—',
      baseUnit: offer.products?.base_unit ?? 'unit',
      sku: offer.supplier_sku,
      price: Number(offer.price_excl_vat),
      stock: offer.stock_qty,
      packLabel: offer.pack_label,
      packQty: offer.pack_qty,
      isActive: offer.is_active,
    }))
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.productName.localeCompare(b.productName, 'he')
    })

  // One entry per order, carrying only this supplier's lines — which is what a
  // purchase order per supplier will look like once a cart splits.
  const byOrder = new Map<string, ConsoleOrder>()
  for (const line of (lines ?? []) as unknown as RawLine[]) {
    if (!line.orders) continue
    const existing = byOrder.get(line.orders.id)
    const entry = {
      id: line.id,
      name: line.product_name_he,
      quantity: line.quantity,
      unitPrice: Number(line.unit_price_excl_vat),
      lineTotal: Number(line.line_total_excl_vat),
    }
    if (existing) {
      existing.lines.push(entry)
      existing.total += entry.lineTotal
    } else {
      byOrder.set(line.orders.id, {
        id: line.orders.id,
        orderNumber: line.orders.order_number,
        status: line.orders.status,
        createdAt: line.orders.created_at,
        buyer: line.orders.business_name || line.orders.customer_name || 'ללא שם',
        phone: line.orders.customer_phone,
        address: [line.orders.address, line.orders.city].filter(Boolean).join(', ') || null,
        paymentTerms: line.orders.payment_method,
        lines: [entry],
        total: entry.lineTotal,
      })
    }
  }

  const orders = [...byOrder.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <SupplierConsole
      company={supplier.company_name}
      orders={orders}
      offers={offerRows}
      terms={{
        minOrder: supplier.min_order_value_excl_vat,
        leadTimeDays: supplier.default_lead_time_days,
        pickupAddress: supplier.pickup_address,
      }}
    />
  )
}
