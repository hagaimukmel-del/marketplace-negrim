import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Order Agent — Step 5
 *
 * Flow:
 * 1. Carpenter selects a product + supplier
 * 2. Show pre-confirmation (price, stock, lead time)
 * 3. Revalidate live data (nothing changed?)
 * 4. Create order if all checks pass
 */

export interface OrderConfirmationRequest {
  carpenterId: string
  productId: string
  supplierId: string
  quantity?: number // Default 1 min_order_qty from offer
}

export interface OrderConfirmationResponse {
  success: boolean
  message: string
  summary?: {
    productName: string
    supplierName: string
    priceExclVat: number
    quantity: number
    totalExclVat: number
    leadTimeDays?: number | null
  }
  orderId?: string
  requiresConfirmation?: boolean // Show confirmation page?
}

/**
 * Revalidate that live data hasn't changed
 * Called before order creation
 */
async function revalidateLiveData(
  productId: string,
  supplierId: string,
  requestedQty: number
): Promise<{
  valid: boolean
  reason?: string
  currentData?: {
    priceExclVat: number
    stockQty: number
    supplierStatus: string
    minOrderQty: number
    leadTimeDays?: number | null
  }
}> {
  const supabase = getSupabaseAdmin()

  // 1. Check supplier is still approved
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('status')
    .eq('id', supplierId)
    .single()

  if (supplierError || !supplier) {
    return { valid: false, reason: 'ספק לא נמצא' }
  }

  if (supplier.status !== 'approved') {
    return { valid: false, reason: `ספק אינו פעיל (status: ${supplier.status})` }
  }

  // 2. Check offer still active with current stock
  const { data: offer, error: offerError } = await supabase
    .from('supplier_offers')
    .select('price_excl_vat, stock_qty, min_order_qty, lead_time_days, is_active')
    .eq('product_id', productId)
    .eq('supplier_id', supplierId)
    .single()

  if (offerError || !offer) {
    return { valid: false, reason: 'הצעה לא נמצאת' }
  }

  if (!offer.is_active) {
    return { valid: false, reason: 'הצעה אינה פעילה יותר' }
  }

  if (offer.stock_qty < requestedQty) {
    return {
      valid: false,
      reason: `מלאי בלבד: ${offer.stock_qty} יחידות (ביקשת ${requestedQty})`,
    }
  }

  if (requestedQty < offer.min_order_qty) {
    return {
      valid: false,
      reason: `מינימום הזמנה: ${offer.min_order_qty} יחידות`,
    }
  }

  return {
    valid: true,
    currentData: {
      priceExclVat: offer.price_excl_vat,
      stockQty: offer.stock_qty,
      supplierStatus: supplier.status,
      minOrderQty: offer.min_order_qty,
      leadTimeDays: offer.lead_time_days,
    },
  }
}

/**
 * Create order in Nagarim system
 */
async function createOrder(
  carpenterId: string,
  productId: string,
  supplierId: string,
  quantity: number,
  priceExclVat: number,
  productName: string,
  supplierName: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const supabase = getSupabaseAdmin()

  // VAT rate (17% standard in Israel)
  const vatRate = 0.17

  const subtotalExclVat = priceExclVat * quantity
  const vatAmount = subtotalExclVat * vatRate
  const totalAmount = subtotalExclVat + vatAmount

  // Create order
  const orderNumber = `ORDER-${Date.now()}`
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      carpenter_id: carpenterId,
      supplier_id: supplierId,
      order_number: orderNumber,
      subtotal_excl_vat: subtotalExclVat,
      vat_rate: vatRate,
      total_amount: totalAmount,
      status: 'submitted',
      customer_name: 'TBD',
      customer_email: 'TBD',
      customer_phone: 'TBD',
    } as any)
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('Order creation error:', orderError)
    return { success: false, error: 'Failed to create order' }
  }

  // Create order item
  const lineTotal = priceExclVat * quantity
  const { error: itemError } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: productId,
      supplier_id: supplierId,
      quantity,
      unit_price_excl_vat: priceExclVat,
      line_total_excl_vat: lineTotal,
      product_name_he: productName,
      product_name_en: productName,
    } as any)

  if (itemError) {
    console.error('Order item creation error:', itemError)
    return { success: false, error: 'Failed to add item to order' }
  }

  return { success: true, orderId: order.id }
}

/**
 * Main: Process order confirmation
 */
export async function confirmOrder(
  request: OrderConfirmationRequest
): Promise<OrderConfirmationResponse> {
  try {
    const quantity = request.quantity || 1

    // 1. Revalidate live data
    const revalidation = await revalidateLiveData(
      request.productId,
      request.supplierId,
      quantity
    )

    if (!revalidation.valid) {
      return {
        success: false,
        message: `לא יכולנו להשלים את ההזמנה: ${revalidation.reason}`,
      }
    }

    const data = revalidation.currentData!

    // 2. Get product name
    const supabase = getSupabaseAdmin()
    const { data: product } = await supabase
      .from('products')
      .select('name_he')
      .eq('id', request.productId)
      .single()

    const productName = product?.name_he || 'מוצר'

    // 3. Get supplier name
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('company_name')
      .eq('id', request.supplierId)
      .single()

    const supplierName = supplier?.company_name || 'ספק'

    // 4. Create order
    const orderResult = await createOrder(
      request.carpenterId,
      request.productId,
      request.supplierId,
      quantity,
      data.priceExclVat,
      productName,
      supplierName
    )

    if (!orderResult.success) {
      return {
        success: false,
        message: `שגיאה ביצירת הזמנה: ${orderResult.error}`,
      }
    }

    return {
      success: true,
      message: `ההזמנה נוצרה בהצלחה! מספר הזמנה: ${orderResult.orderId}`,
      summary: {
        productName,
        supplierName,
        priceExclVat: data.priceExclVat,
        quantity,
        totalExclVat: data.priceExclVat * quantity,
        leadTimeDays: data.leadTimeDays,
      },
      orderId: orderResult.orderId,
    }
  } catch (err) {
    console.error('Order confirmation error:', err)
    return {
      success: false,
      message: `שגיאה בלתי צפויה: ${err instanceof Error ? err.message : 'Unknown'}`,
    }
  }
}
