import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { readConfirmToken } from './supplier-link'

export interface ConfirmLine {
  id: string
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
}

export interface ConfirmView {
  orderId: string
  supplierId: string
  supplierName: string
  orderNumber: string
  createdAt: string
  businessName: string | null
  contactName: string | null
  phone: string | null
  city: string | null
  address: string | null
  paymentTerms: string | null
  notes: string | null
  lines: ConfirmLine[]
  submittedTotal: number
  status: string
  confirmedTotal: number | null
  confirmedAt: string | null
  supplierNote: string | null
}

export type ConfirmResult =
  | { ok: true; view: ConfirmView }
  | { ok: false; reason: 'invalid' | 'missing' | 'split' }

/**
 * Resolve a signed link to the order it names, with only that supplier's lines.
 *
 * The split check is the important one. `orders.status` is a single field for
 * the whole order, so confirming an order that also contains another supplier's
 * lines would speak for a company that never saw it. Until one cart becomes one
 * purchase order per supplier, such an order is refused here and sent to the
 * console rather than half-confirmed by the wrong party.
 */
export async function loadConfirmable(token: string): Promise<ConfirmResult> {
  const claim = readConfirmToken(token)
  if (!claim) return { ok: false, reason: 'invalid' }

  const supabase = getSupabaseAdmin()

  const [{ data: order }, { data: supplier }, { data: allLines }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, created_at, status, business_name, customer_name, customer_phone, city, address, payment_method, notes, subtotal_excl_vat, confirmed_subtotal_excl_vat, confirmed_at, supplier_note'
      )
      .eq('id', claim.orderId)
      .maybeSingle(),
    supabase.from('suppliers').select('id, company_name').eq('id', claim.supplierId).maybeSingle(),
    supabase
      .from('order_items')
      .select('id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, supplier_id')
      .eq('order_id', claim.orderId),
  ])

  if (!order || !supplier) return { ok: false, reason: 'missing' }

  const lines = allLines ?? []
  const suppliersOnOrder = new Set(lines.map((line) => line.supplier_id))
  if (suppliersOnOrder.size > 1) return { ok: false, reason: 'split' }

  const mine = lines.filter((line) => line.supplier_id === claim.supplierId)
  if (mine.length === 0) return { ok: false, reason: 'missing' }

  return {
    ok: true,
    view: {
      orderId: order.id,
      supplierId: supplier.id,
      supplierName: supplier.company_name,
      orderNumber: order.order_number,
      createdAt: order.created_at ?? new Date().toISOString(),
      businessName: order.business_name,
      contactName: order.customer_name,
      phone: order.customer_phone,
      city: order.city,
      address: order.address,
      paymentTerms: order.payment_method,
      notes: order.notes,
      lines: mine.map((line) => ({
        id: line.id,
        product_name_he: line.product_name_he,
        quantity: line.quantity,
        unit_price_excl_vat: Number(line.unit_price_excl_vat),
        line_total_excl_vat: Number(line.line_total_excl_vat),
      })),
      submittedTotal: Number(order.subtotal_excl_vat ?? 0),
      status: order.status ?? 'pending',
      confirmedTotal:
        order.confirmed_subtotal_excl_vat == null
          ? null
          : Number(order.confirmed_subtotal_excl_vat),
      confirmedAt: order.confirmed_at,
      supplierNote: order.supplier_note,
    },
  }
}
