import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, sendEmail } from './email'
import { newOrderHtml, newOrderSubject, type NewOrderLine } from './emails/new-order'
import {
  carpenterOrderSentHtml,
  carpenterOrderSentSubject,
  type CarpenterOrderLine,
  carpenterOrderUpdateHtml,
  carpenterOrderUpdateSubject,
} from './emails/carpenter'

/**
 * Tell each supplier about the purchase order addressed to them, and the
 * carpenter about everything they just sent.
 *
 * One checkout becomes one order per supplier, so each supplier gets one email
 * with their own order, their own lines and their own subtotal — nobody sees
 * another company's prices. The carpenter gets a single email covering all of
 * them, not one per supplier. The operator deliberately does not get a copy: he
 * watches the console, and a message per order would train him to ignore them.
 *
 * Never throws. A notification that fails must not take an order down with it;
 * the orders are already saved and the console still shows them.
 */
export async function notifyNewOrders(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return
  try {
    const supabase = getSupabaseAdmin()

    const [{ data: orders }, { data: lines }] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, order_number, short_number, created_at, business_name, customer_name, customer_email, customer_phone, city, address, payment_method, notes'
        )
        .in('id', orderIds)
        .order('order_number'),
      supabase
        .from('order_items')
        .select('order_id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, supplier_id')
        .in('order_id', orderIds),
    ])

    if (!orders || orders.length === 0 || !lines || lines.length === 0) return

    const supplierIds = [...new Set(lines.map((line) => line.supplier_id).filter(Boolean))] as string[]
    const { data: suppliers } = supplierIds.length
      ? await supabase.from('suppliers').select('id, company_name, email').in('id', supplierIds)
      : { data: [] as { id: string; company_name: string; email: string | null }[] }
    const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]))

    const first = orders[0]
    const carpenterName = first.business_name || first.customer_name || 'נגרייה'
    const sent: { orderNumber: string; supplier: string; lines: CarpenterOrderLine[]; subtotal: number }[] = []

    for (const order of orders) {
      const orderLines = lines.filter((line) => line.order_id === order.id)
      const bySupplier = new Map<string, NewOrderLine[]>()
      for (const line of orderLines) {
        if (!line.supplier_id) continue
        bySupplier.set(line.supplier_id, [
          ...(bySupplier.get(line.supplier_id) ?? []),
          {
            product_name_he: line.product_name_he,
            quantity: line.quantity,
            unit_price_excl_vat: Number(line.unit_price_excl_vat),
            line_total_excl_vat: Number(line.line_total_excl_vat),
          },
        ])
      }

      for (const [supplierId, supplierLines] of bySupplier) {
        const supplier = supplierById.get(supplierId)
        if (!supplier) continue
        const subtotal = Number(supplierLines.reduce((sum, line) => sum + line.line_total_excl_vat, 0).toFixed(2))
        sent.push({
          orderNumber: order.short_number ? `#${order.short_number}` : order.order_number,
          supplier: supplier.company_name,
          subtotal,
          lines: supplierLines.map((line) => ({
            name: line.product_name_he,
            quantity: line.quantity,
            lineTotal: line.line_total_excl_vat,
            supplier: supplier.company_name,
          })),
        })

        if (!supplier.email) {
          console.info(`[email] supplier ${supplier.company_name} has no address; nothing sent`)
          continue
        }

        const payload = {
          orderId: order.id,
          supplierId: supplier.id,
          orderNumber: order.short_number ? `#${order.short_number}` : order.order_number,
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
          // The confirm button works on an order this supplier owns outright,
          // which since the split is every new order. Older orders that held
          // more than one supplier are still confirmed centrally.
          html: newOrderHtml(payload, { canConfirm: bySupplier.size === 1 }),
          // A test carpenter ordering from a real supplier is still a test; the
          // real supplier must not receive it.
          isTest: isTestName(supplier.company_name, payload.carpenterName),
        })
      }
    }

    // And the carpenter: one email for everything they sent, order by order.
    if (first.customer_email && sent.length > 0) {
      await sendEmail({
        to: first.customer_email,
        subject: carpenterOrderSentSubject(sent.map((order) => order.orderNumber)),
        html: carpenterOrderSentHtml({
          businessName: carpenterName,
          orders: sent,
          paymentTerms: first.payment_method,
        }),
        isTest: isTestName(carpenterName, ...sent.map((order) => order.supplier)),
      })
    }
  } catch (err) {
    console.error('[email] notifying suppliers failed', err)
  }
}

/** One order, for callers that hold a single id. */
export async function notifyNewOrder(orderId: string): Promise<void> {
  await notifyNewOrders([orderId])
}

/**
 * Tell the carpenter the supplier answered: confirmed (with the amount, and a
 * visible warning if it differs from what they ordered) or sent out.
 * Never throws, for the same reason as above.
 */
export async function notifyCarpenterOrderUpdate(orderId: string, kind: 'confirmed' | 'shipped'): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const [{ data: order }, { data: lines }] = await Promise.all([
      supabase
        .from('orders')
        .select('order_number, short_number, business_name, customer_name, customer_email, subtotal_excl_vat, confirmed_subtotal_excl_vat, supplier_note')
        .eq('id', orderId)
        .maybeSingle(),
      supabase.from('order_items').select('supplier_id').eq('order_id', orderId),
    ])
    if (!order?.customer_email) return

    const supplierIds = [...new Set((lines ?? []).map((line) => line.supplier_id).filter(Boolean))] as string[]
    const { data: suppliers } = supplierIds.length
      ? await supabase.from('suppliers').select('company_name, phone').in('id', supplierIds)
      : { data: [] as { company_name: string; phone: string | null }[] }

    const carpenterName = order.business_name || order.customer_name || 'נגרייה'
    const supplier = suppliers?.[0]

    await sendEmail({
      to: order.customer_email,
      subject: carpenterOrderUpdateSubject(kind, order.short_number ? `#${order.short_number}` : order.order_number),
      html: carpenterOrderUpdateHtml({
        kind,
        businessName: carpenterName,
        orderNumber: order.short_number ? `#${order.short_number}` : order.order_number,
        supplierName: (suppliers ?? []).map((item) => item.company_name).join(' / ') || 'הספק',
        supplierPhone: suppliers && suppliers.length === 1 ? supplier?.phone ?? null : null,
        submitted: Number(order.subtotal_excl_vat),
        confirmed: order.confirmed_subtotal_excl_vat == null ? null : Number(order.confirmed_subtotal_excl_vat),
        note: order.supplier_note,
      }),
      isTest: isTestName(carpenterName, ...(suppliers ?? []).map((item) => item.company_name)),
    })
  } catch (err) {
    console.error('[email] notifying carpenter failed', err)
  }
}
