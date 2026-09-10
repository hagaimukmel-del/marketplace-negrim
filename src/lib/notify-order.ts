import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { sendEmail } from './email'
import { newOrderHtml, newOrderSubject, type NewOrderLine } from './emails/new-order'

/**
 * Tell each supplier on an order that it exists.
 *
 * One email per supplier, carrying only that supplier's lines and only their
 * subtotal — nobody sees another company's prices. The operator deliberately
 * does not get a copy: he watches the console, and a message per order would
 * train him to ignore them.
 *
 * Never throws. A notification that fails must not take an order down with it;
 * the order is already saved and the console still shows it.
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    const [{ data: order }, { data: lines }] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, order_number, business_name, customer_name, customer_phone, city, address, payment_method, notes'
        )
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('order_items')
        .select('product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, supplier_id')
        .eq('order_id', orderId),
    ])

    if (!order || !lines || lines.length === 0) return

    const bySupplier = new Map<string, NewOrderLine[]>()
    for (const line of lines) {
      if (!line.supplier_id) continue
      const existing = bySupplier.get(line.supplier_id)
      const entry: NewOrderLine = {
        product_name_he: line.product_name_he,
        quantity: line.quantity,
        unit_price_excl_vat: Number(line.unit_price_excl_vat),
        line_total_excl_vat: Number(line.line_total_excl_vat),
      }
      if (existing) existing.push(entry)
      else bySupplier.set(line.supplier_id, [entry])
    }

    if (bySupplier.size === 0) return

    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, company_name, email')
      .in('id', [...bySupplier.keys()])

    for (const supplier of suppliers ?? []) {
      if (!supplier.email) {
        console.info(`[email] supplier ${supplier.company_name} has no address; nothing sent`)
        continue
      }

      const supplierLines = bySupplier.get(supplier.id) ?? []
      const subtotal = Number(
        supplierLines.reduce((sum, line) => sum + line.line_total_excl_vat, 0).toFixed(2)
      )

      const payload = {
        orderId: order.id,
        supplierId: supplier.id,
        orderNumber: order.order_number,
        carpenterName: order.business_name || order.customer_name || 'נגרייה',
        contactName: order.business_name ? order.customer_name : null,
        phone: order.customer_phone,
        city: order.city,
        address: order.address,
        paymentTerms: order.payment_method,
        notes: order.notes,
        lines: supplierLines,
        subtotalExclVat: subtotal,
      }

      await sendEmail({
        to: supplier.email,
        subject: newOrderSubject(payload),
        // The confirm button only works on an order this supplier owns outright,
        // because order status is one field for the whole order.
        html: newOrderHtml(payload, { canConfirm: bySupplier.size === 1 }),
      })
    }
  } catch (err) {
    console.error('[email] notifying suppliers failed', err)
  }
}
