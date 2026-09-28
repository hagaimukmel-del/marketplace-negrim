import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'

type ProductSpec = Database['public']['Tables']['product_specifications']['Row']

/**
 * Procurement Agent for carpenters
 *
 * Flow:
 * 1. Parse intent from user request (Hebrew text)
 * 2. Search products for matches
 * 3. Select response type based on matches
 * 4. Generate natural Hebrew response with options
 */

type ConversationState =
  | 'greeting'
  | 'clarifying'
  | 'searching'
  | 'results_single'
  | 'results_multiple'
  | 'comparing'
  | 'no_results'
  | 'refining'
  | 'done'

type ResponseType =
  | 'simple_result'
  | 'multiple_results'
  | 'clarifying'
  | 'no_results'
  | 'recommendation'
  | 'dont_know'
  | 'comparison'

interface ActionButton {
  label: string
  action: string
  value?: string
}

export interface ProcurementRequest {
  userMessage: string
  carpenterId: string
}

export interface OrderPreview {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface ProcurementResponse {
  success: boolean
  message: string
  state: ConversationState
  matchedProducts?: MatchedProduct[]
  followUp?: {
    type: 'selection' | 'clarification' | 'comparison' | 'order_confirmation' | 'supplier_contact' | 'none'
    options?: string[]
  }
  actions?: ActionButton[]
  orderPreview?: {
    items: OrderPreview[]
    subtotalExclVat: number
    vatAmount: number
    totalInclVat: number
  }
  supplierContact?: {
    supplierId: string
    supplierName: string
    action: 'quote_request' | 'inquiry' | 'support'
  }
}

export interface MatchedProduct {
  productId: string
  productName: string
  baseUnit: string // יחידה אטומית: unit/kg/liter/meter/sqm
  specs: Array<{
    key: string
    value: string
    unit?: string | null
  }>
  sourceDocuments: string[]
  confidence: number
  // Live data (Step 4)
  offers?: Array<{
    supplierId: string
    supplierName: string
    priceExclVat: number
    packQty?: number | null // כמה base_units בחבילה
    stockQty: number
    minOrderQty: number
    leadTimeDays?: number | null
    isActive: boolean
  }>
  // Step 5: Document citations
  documents?: Array<{
    id: string
    title_he: string
    doc_type: string
    file_url: string
    extracted_text?: string | null
  }>
}

/**
 * Intent: What the carpenter is looking for
 */
interface ParsedIntent {
  category?: string // adhesive, wood, tool, etc
  material?: string // birch, pine, oak, etc
  application?: string // bonding, finishing, etc
  quantity?: string
  confidence: number
  rawText: string
}

/**
 * Parse user request to extract intent
 *
 * Example: "אני צריך דבק לבירץ׳"
 * Output: { category: 'דבק', material: 'birch', confidence: 0.9 }
 */
function parseIntent(userMessage: string): ParsedIntent {
  const hebrew = userMessage.toLowerCase()

  // Simple pattern matching for MVP
  // TODO: Replace with Claude API for better understanding

  const intent: ParsedIntent = {
    rawText: userMessage,
    confidence: 0.5,
  }

  // Category keywords - use Hebrew words instead of English
  if (hebrew.includes('דבק') || hebrew.includes('glue') || hebrew.includes('adhesive') || hebrew.includes('דבקים') || hebrew.includes('דביק')) {
    intent.category = 'דבק'
    intent.confidence += 0.2
  } else if (
    hebrew.includes('צבע') ||
    hebrew.includes('פוליש') ||
    hebrew.includes('varnish') ||
    hebrew.includes('צבעים') ||
    hebrew.includes('צביעה') ||
    hebrew.includes('לכה')
  ) {
    intent.category = 'צבע'
    intent.confidence += 0.2
  } else if (hebrew.includes('כלי') || hebrew.includes('tool') || hebrew.includes('כלים')) {
    intent.category = 'כלי'
    intent.confidence += 0.2
  }

  // Product types or use cases (קנקוטיים/קנטים = edge banding machines, לוחות = boards)
  if (hebrew.includes('קנקוט') || hebrew.includes('קנט') || hebrew.includes('canister') || hebrew.includes('edge')) {
    // User is asking about glue for edge banding machines (קנטים)
    // Don't change category, just boost confidence for adhesive matches
    if (intent.category === 'adhesive') {
      intent.confidence += 0.1
    }
  }
  if (hebrew.includes('לוח') || hebrew.includes('board')) {
    intent.category = 'finishing'
    intent.confidence += 0.15
  }

  // Material keywords
  if (hebrew.includes('בירץ') || hebrew.includes('birch')) {
    intent.material = 'birch'
    intent.confidence += 0.2
  } else if (hebrew.includes('אורן') || hebrew.includes('pine')) {
    intent.material = 'pine'
    intent.confidence += 0.2
  } else if (hebrew.includes('אלון') || hebrew.includes('oak')) {
    intent.material = 'oak'
    intent.confidence += 0.2
  }

  // Application keywords
  if (hebrew.includes('הדבק') || hebrew.includes('bond') || hebrew.includes('glue')) {
    intent.application = 'bonding'
    intent.confidence += 0.1
  } else if (hebrew.includes('סיים') || hebrew.includes('finish')) {
    intent.application = 'finishing'
    intent.confidence += 0.1
  }

  // Quantity
  const qtyMatch = hebrew.match(/(\d+)\s*(ק״ג|קילו|kg|ליטר|liter)/i)
  if (qtyMatch) {
    intent.quantity = qtyMatch[0]
    intent.confidence += 0.1
  }

  return intent
}

/**
 * Search products by name and description for matches
 */
async function findMatchingProducts(
  intent: ParsedIntent
): Promise<MatchedProduct[]> {
  const supabase = getSupabaseAdmin()

  // Search products by name matching category/material keywords
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      `
      id,
      name_he,
      name_en,
      description_he,
      brand,
      mpn,
      base_unit
    `
    )
    .limit(100)

  if (productsError || !products) {
    console.error('Products query error:', productsError)
    return []
  }

  // Score products based on intent matches
  const productMap = new Map<string, MatchedProduct>()

  for (const product of products) {
    const productName = (product.name_he || product.name_en || '').toLowerCase()
    const description = (product.description_he || '').toLowerCase()
    const combined = `${productName} ${description}`.toLowerCase()

    let confidence = 0

    // Match category keywords
    if (intent.category) {
      const categoryLower = intent.category.toLowerCase()
      if (productName.includes(categoryLower) || description.includes(categoryLower)) {
        confidence += 0.4
      }
    }

    // Match material keywords
    if (intent.material) {
      const materialLower = intent.material.toLowerCase()
      if (combined.includes(materialLower)) {
        confidence += 0.3
      }
    }

    // Match application keywords
    if (intent.application) {
      const applicationLower = intent.application.toLowerCase()
      if (combined.includes(applicationLower)) {
        confidence += 0.2
      }
    }

    // Only keep products with some match
    if (confidence > 0) {
      productMap.set(product.id, {
        productId: product.id,
        productName: product.name_he || product.name_en || 'Unknown',
        baseUnit: product.base_unit || 'unit',
        specs: [
          {
            key: 'יחידת בסיס',
            value: product.base_unit || 'יחידה',
          },
        ],
        sourceDocuments: [],
        confidence,
        offers: [],
      })
    }
  }

  // Step 4: Fetch live offer data for each matched product
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5) // Top 5 matches

  for (const product of topProducts) {
    // Fetch live offer data
    const { data: offers, error: offersError } = await supabase
      .from('supplier_offers')
      .select(
        `
        id,
        supplier_id,
        price_excl_vat,
        pack_qty,
        stock_qty,
        min_order_qty,
        lead_time_days,
        is_active,
        suppliers (
          id,
          company_name,
          status
        )
      `
      )
      .eq('product_id', product.productId)
      .eq('is_active', true)
      .order('stock_qty', { ascending: false })

    if (offersError) {
      console.error('Offers query error:', offersError)
      continue
    }

    if (offers && offers.length > 0) {
      product.offers = offers
        .filter((offer: any) => {
          // Only include approved suppliers
          return offer.suppliers?.status === 'approved'
        })
        .map((offer: any) => ({
          supplierId: offer.supplier_id,
          supplierName: offer.suppliers?.company_name || 'Unknown Supplier',
          priceExclVat: offer.price_excl_vat,
          packQty: offer.pack_qty,
          stockQty: offer.stock_qty,
          minOrderQty: offer.min_order_qty,
          leadTimeDays: offer.lead_time_days,
          isActive: offer.is_active,
        }))
        .slice(0, 3) // Top 3 suppliers per product
    }

    // Step 5: Fetch product documents for citations
    // TODO: Add access control layer — currently all documents are shown to all carpenters.
    // Future: check document visibility settings and supplier-carpenter relationship.
    const { data: docs, error: docsError } = await supabase
      .from('product_documents')
      .select('id, title_he, doc_type, file_url, extracted_text')
      .eq('product_id', product.productId)
      .order('uploaded_at', { ascending: false })
      .limit(3) // Top 3 documents per product

    if (!docsError && docs && docs.length > 0) {
      product.documents = docs.map((doc: any) => ({
        id: doc.id,
        title_he: doc.title_he,
        doc_type: doc.doc_type,
        file_url: doc.file_url,
        extracted_text: doc.extracted_text,
      }))
    }
  }

  return topProducts
}

/**
 * Select response type based on search results and intent
 */
function selectResponseType(intent: ParsedIntent, results: MatchedProduct[]): ResponseType {
  if (results.length === 0) {
    return intent.confidence < 0.5 ? 'clarifying' : 'no_results'
  }

  if (results.length === 1) {
    return 'simple_result'
  }

  if (results.length > 1 && results.length <= 4) {
    return 'multiple_results'
  }

  return 'multiple_results'
}

/**
 * Format price in Hebrew
 */
function formatPrice(price: number, baseUnit?: string, packQty?: number | null): string {
  const unitLabel = baseUnit ? ` / ${getUnitLabel(baseUnit)}` : ''
  const pricePerUnit = packQty && packQty > 1 ? (price / packQty).toFixed(2) : price.toFixed(0)
  const packInfo = packQty && packQty > 1 ? ` (חבילה: ${packQty} ${baseUnit})` : ''
  return `₪${pricePerUnit}${unitLabel}${packInfo}`
}

function getUnitLabel(baseUnit: string): string {
  const labels: Record<string, string> = {
    unit: 'יח׳',
    kg: 'ק״ג',
    liter: 'ליטר',
    meter: 'מטר',
    sqm: 'מ״ר',
  }
  return labels[baseUnit] || baseUnit
}

/**
 * Format lead time in Hebrew
 */
function formatLeadTime(days?: number | null): string {
  if (!days) return 'זמן הסעה לא ידוע'
  if (days === 0) return 'היום'
  if (days === 1) return 'מחר'
  return `${days} ימים`
}

/**
 * Map doc type to Hebrew label
 */
function getDocTypeLabel(docType: string): string {
  const labels: Record<string, string> = {
    spec_sheet: 'דף טכני',
    usage_guide: 'הנחיות שימוש',
    image: 'תמונה',
    datasheet: 'דטאשיט',
    other: 'מסמך',
  }
  return labels[docType] || 'מסמך'
}

/**
 * Generate natural Hebrew response with live data
 */
function generateResponse(intent: ParsedIntent, matches: MatchedProduct[]): string {
  if (matches.length === 0) {
    // No matches found - clarify or suggest alternatives
    if (intent.confidence < 0.5) {
      // Need more information
      let response = '🤔 כדי למצוא לך בדיוק מה שצריך:\n'

      if (!intent.category) {
        response += '\n• איזה סוג מוצר? (דבק, צבע, כלי, וכו\')'
      } else {
        response += `\n✅ מחפש: ${intent.category}`
      }

      if (!intent.material) {
        response += '\n• עם איזה עץ אתה עובד? (בירץ, אורן, אלון, וכו\')'
      } else if (intent.material) {
        response += `\n✅ חומר: ${intent.material}`
      }

      if (!intent.quantity) {
        response += '\n• כמה אתה צריך? (ק"ג/ליטר)'
      }

      response += '\n\nתן לי עוד פרטים 👇'
      return response
    } else {
      // High confidence but no exact match
      let response = `❌ לא מצאתי ${intent.category || 'מוצר'} בשם המדויק.\n\n`
      response += '🤷 אבל אני מנחש שחיפשת:\n'

      if (intent.category) {
        response += `• סוג: ${intent.category}\n`
      }
      if (intent.material) {
        response += `• חומר: ${intent.material}\n`
      }
      if (intent.quantity) {
        response += `• כמות: ${intent.quantity}\n`
      }

      response += '\nתוכל להסביר קצת יותר או לחפש משהו אחר?'
      return response
    }
  }

  if (matches.length === 1) {
    const product = matches[0]
    let response = `מצאתי מוצר שמתאים:\n\n**${product.productName}**`

    // Step 5: Show document evidence
    if (product.documents && product.documents.length > 0) {
      response += '\n\n📄 **מסמכים טכניים:**'
      for (const doc of product.documents.slice(0, 2)) {
        const label = getDocTypeLabel(doc.doc_type)
        response += `\n- ${label}: [${doc.title_he}](${doc.file_url})`
      }
    }

    if (product.specs.length > 0) {
      response += '\n\nמפרטים:'
      for (const spec of product.specs.slice(0, 3)) {
        const unit = spec.unit ? ` ${spec.unit}` : ''
        response += `\n- ${spec.key}: ${spec.value}${unit}`
      }
    }

    // Step 4: Show live offer data
    if (product.offers && product.offers.length > 0) {
      response += '\n\nאפשרויות רכש:'
      for (const offer of product.offers.slice(0, 2)) {
        response += `\n- **${offer.supplierName}**`
        response += ` • מחיר: ${formatPrice(offer.priceExclVat, product.baseUnit, offer.packQty)}`

        if (offer.stockQty > 0) {
          response += ` • מלאי: ${offer.stockQty} יחידות`
        } else {
          response += ` • אין במלאי כרגע`
        }

        response += ` • הסעה: ${formatLeadTime(offer.leadTimeDays)}`
      }
    } else {
      response += '\n\nלא מצאתי ספקים עם מלאי בזמן זה.'
    }

    if (product.sourceDocuments.length > 0) {
      response += `\n\n(מידע מתוך ${product.sourceDocuments.length} מסמך/ים מאושר/ים)`
    }

    response += '\n\nרוצה שנמצא לך עוד אפשרויות?'
    return response
  }

  // Multiple matches - show up to 4 options with numbers
  const showLimit = Math.min(4, matches.length)
  let response = `🔍 מצאתי ${matches.length} מוצרים שמתאימים. בואי נצמצם:\n`

  const emojis = ['🟢', '🟡', '🔵', '🟣']

  for (let i = 0; i < showLimit; i++) {
    const product = matches[i]
    const number = i + 1
    const emoji = emojis[i] || '⚪'
    response += `\n${number}) ${emoji} **${product.productName}**`

    // Show price and supplier as main info
    if (product.offers && product.offers.length > 0) {
      const bestOffer = product.offers[0]
      response += ` — ${formatPrice(bestOffer.priceExclVat, product.baseUnit, bestOffer.packQty)}`
      response += ` (${bestOffer.supplierName})`

      // Stock status
      if (bestOffer.stockQty > 0) {
        response += ` • ✅ במלאי`
      } else {
        response += ` • ⏳ אזל`
      }
    }

    // Show if has documents
    if (product.documents && product.documents.length > 0) {
      response += ` 📄`
    }
  }

  response += `\n\nבחר (${Array.from({length: showLimit}, (_, i) => i + 1).join('/')}) או תן לי עוד פרטים.`
  return response
}

/**
 * Retrieve carpenter's recent orders
 */
export async function getOrderHistory(carpenterId: string) {
  const supabase = getSupabaseAdmin()

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      short_number,
      status,
      subtotal_excl_vat,
      total_amount,
      created_at,
      order_items (
        product_id,
        product_name_he,
        quantity
      )
    `
    )
    .eq('carpenter_id', carpenterId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (ordersError) {
    console.error('Order history error:', ordersError)
    return []
  }

  return orders || []
}

/**
 * Find products from carpenter's previous orders
 * Used for "כמו בפעם שעברה" queries
 */
export async function getPreviousProducts(carpenterId: string, limit = 5) {
  const supabase = getSupabaseAdmin()

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
      order_items (
        product_id,
        product_name_he,
        quantity
      )
    `
    )
    .eq('carpenter_id', carpenterId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (ordersError || !orders) {
    return []
  }

  // Flatten order items from all orders
  const allItems = orders.flatMap((order: any) => order.order_items || [])

  // Deduplicate by product_id and take most recent
  const uniqueItems = Array.from(
    new Map(allItems.map((item: any) => [item.product_id, item])).values()
  )

  return uniqueItems.slice(0, limit)
}

/**
 * Main agent function
 */
export async function processProcurementRequest(
  request: ProcurementRequest
): Promise<ProcurementResponse> {
  try {
    // 1. Parse intent
    const intent = parseIntent(request.userMessage)

    // 2. Find matching products
    const matches = await findMatchingProducts(intent)

    // 3. Select response type
    const responseType = selectResponseType(intent, matches)

    // 4. Map to conversation state
    let state: ConversationState = 'searching'
    let followUpType: 'selection' | 'clarification' | 'comparison' | 'none' = 'none'

    switch (responseType) {
      case 'simple_result':
        state = 'results_single'
        followUpType = 'none'
        break
      case 'multiple_results':
        state = 'results_multiple'
        followUpType = 'selection'
        break
      case 'clarifying':
        state = 'clarifying'
        followUpType = 'clarification'
        break
      case 'no_results':
        state = 'no_results'
        followUpType = 'none'
        break
    }

    // 5. Generate response
    const message = generateResponse(intent, matches)

    // 6. Prepare action buttons based on result type
    const actions: ActionButton[] = []

    if (followUpType === 'selection') {
      // Multiple results - show numbered selection buttons
      const optionCount = Math.min(4, matches.length)
      const emojis = ['🟢', '🟡', '🔵', '🟣']
      for (let i = 0; i < optionCount; i++) {
        const number = i + 1
        actions.push({
          label: `בחר אפשרות ${number} ${emojis[i]}`,
          action: `select-${number}`,
          value: number.toString(),
        })
      }
    } else if (matches.length === 1) {
      // Single result - show action buttons
      actions.push({
        label: '➕ הוסף לעגלה',
        action: 'add-to-cart',
        value: matches[0].productId,
      })
      actions.push({
        label: '🔍 חיפוש דומה',
        action: 'refine-search',
      })
    }

    return {
      success: true,
      message,
      state,
      matchedProducts: matches,
      followUp: {
        type: followUpType,
        options: followUpType === 'selection' ? Array.from({ length: Math.min(4, matches.length) }, (_, i) => (i + 1).toString()) : undefined,
      },
      actions: actions.length > 0 ? actions : [],
    }
  } catch (err) {
    console.error('Agent error:', err)
    return {
      success: false,
      message: 'קרתה שגיאה. בואי ננסה שוב.',
      state: 'done',
    }
  }
}
