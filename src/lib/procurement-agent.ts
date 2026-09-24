import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'

type ProductSpec = Database['public']['Tables']['product_specifications']['Row']

/**
 * Procurement Agent for carpenters
 *
 * Flow:
 * 1. Parse intent from user request (Hebrew text)
 * 2. Search product_specifications for matches
 * 3. Generate natural Hebrew response with options
 */

export interface ProcurementRequest {
  userMessage: string
  carpenterId?: string
}

export interface ProcurementResponse {
  success: boolean
  message: string
  matchedProducts?: MatchedProduct[]
  followUp?: string
}

export interface MatchedProduct {
  productId: string
  productName: string
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
    stockQty: number
    minOrderQty: number
    leadTimeDays?: number | null
    isActive: boolean
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
 * Output: { category: 'adhesive', material: 'birch', confidence: 0.9 }
 */
function parseIntent(userMessage: string): ParsedIntent {
  const hebrew = userMessage.toLowerCase()

  // Simple pattern matching for MVP
  // TODO: Replace with Claude API for better understanding

  const intent: ParsedIntent = {
    rawText: userMessage,
    confidence: 0.5,
  }

  // Category keywords
  if (hebrew.includes('דבק') || hebrew.includes('glue') || hebrew.includes('adhesive')) {
    intent.category = 'adhesive'
    intent.confidence += 0.2
  } else if (
    hebrew.includes('צבע') ||
    hebrew.includes('פוליש') ||
    hebrew.includes('varnish')
  ) {
    intent.category = 'finishing'
    intent.confidence += 0.2
  } else if (hebrew.includes('כלי') || hebrew.includes('tool')) {
    intent.category = 'tool'
    intent.confidence += 0.2
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
 * Search product_specifications for matches
 */
async function findMatchingProducts(
  intent: ParsedIntent
): Promise<MatchedProduct[]> {
  const supabase = getSupabaseAdmin()

  // Build search query
  let query = supabase
    .from('product_specifications')
    .select(
      `
      id,
      product_id,
      spec_key,
      spec_value,
      spec_unit,
      is_verified,
      source_document_id,
      created_at,
      products (
        id,
        name_he,
        name_en,
        brand,
        mpn
      )
    `
    )
    .eq('is_verified', true)

  // Filter by spec matches
  const specQueries: string[] = []

  if (intent.material) {
    specQueries.push(`spec_key.eq.material,spec_value.ilike.%${intent.material}%`)
  }

  if (intent.application) {
    specQueries.push(`spec_key.eq.application,spec_value.ilike.%${intent.application}%`)
  }

  if (intent.category) {
    specQueries.push(`spec_key.eq.category,spec_value.ilike.%${intent.category}%`)
  }

  // Execute query
  const { data: specs, error } = await query.order('created_at', { ascending: false })

  if (error || !specs) {
    console.error('Spec query error:', error)
    return []
  }

  // Group by product
  const productMap = new Map<string, MatchedProduct>()

  for (const spec of specs) {
    if (!spec.product_id || !spec.products) continue

    const productId = spec.product_id
    if (!productMap.has(productId)) {
      const product = spec.products as any
      productMap.set(productId, {
        productId,
        productName: product.name_he || product.name_en || 'Unknown',
        specs: [],
        sourceDocuments: [],
        confidence: 0,
        offers: [],
      })
    }

    const matched = productMap.get(productId)!
    matched.specs.push({
      key: spec.spec_key,
      value: spec.spec_value,
      unit: spec.spec_unit,
    })

    if (spec.source_document_id && !matched.sourceDocuments.includes(spec.source_document_id)) {
      matched.sourceDocuments.push(spec.source_document_id)
    }

    // Calculate confidence based on matches
    if (intent.material && spec.spec_value.toLowerCase().includes(intent.material)) {
      matched.confidence += 0.3
    }
    if (intent.application && spec.spec_value.toLowerCase().includes(intent.application)) {
      matched.confidence += 0.3
    }
  }

  // Step 4: Fetch live offer data for each matched product
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5) // Top 5 matches

  for (const product of topProducts) {
    const { data: offers, error: offersError } = await supabase
      .from('supplier_offers')
      .select(
        `
        id,
        supplier_id,
        price_excl_vat,
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
          stockQty: offer.stock_qty,
          minOrderQty: offer.min_order_qty,
          leadTimeDays: offer.lead_time_days,
          isActive: offer.is_active,
        }))
        .slice(0, 3) // Top 3 suppliers per product
    }
  }

  return topProducts
}

/**
 * Format price in Hebrew
 */
function formatPrice(price: number): string {
  return `₪${price.toFixed(0)}`
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
 * Generate natural Hebrew response with live data
 */
function generateResponse(intent: ParsedIntent, matches: MatchedProduct[]): string {
  if (matches.length === 0) {
    // No matches found
    let response = 'לא מצאתי תיעוד שמתאים בדיוק.'

    if (intent.confidence < 0.5) {
      response += '\n\nבואי נבהיר את הצורך שלך:'
      if (!intent.category) {
        response += '\n- איזה סוג מוצר אתה צריך? (דבק, צבע, כלי, וכו\')'
      }
      if (!intent.material) {
        response += '\n- עם איזה עץ אתה עובד?'
      }
    } else {
      response += '\n\nתוכל לפנות לספק כדי לשאול על המוצר שלך, או לחפש משהו אחר.'
    }

    return response
  }

  if (matches.length === 1) {
    const product = matches[0]
    let response = `מצאתי מוצר שמתאים:\n\n**${product.productName}**`

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
        response += ` • מחיר: ${formatPrice(offer.priceExclVat)}`

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

  // Multiple matches
  let response = `מצאתי ${matches.length} מוצרים שמתאימים:\n`

  for (let i = 0; i < Math.min(3, matches.length); i++) {
    const product = matches[i]
    const letter = String.fromCharCode(65 + i) // A, B, C
    response += `\n${letter}) **${product.productName}**`

    // Step 4: Show best offer (cheapest available)
    if (product.offers && product.offers.length > 0) {
      const bestOffer = product.offers[0]
      response += ` — ${formatPrice(bestOffer.priceExclVat)} (${bestOffer.supplierName})`
      if (bestOffer.stockQty > 0) {
        response += ` • במלאי`
      } else {
        response += ` • אין במלאי`
      }
    } else if (product.specs.length > 0) {
      const topSpec = product.specs[0]
      response += ` — ${topSpec.value}`
    }
  }

  response += '\n\nבחר אחד, או תן לי עוד פרטים.'
  return response
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

    // 3. Generate response
    const message = generateResponse(intent, matches)

    return {
      success: true,
      message,
      matchedProducts: matches,
      followUp: matches.length === 0 ? 'clarification' : 'selection',
    }
  } catch (err) {
    console.error('Agent error:', err)
    return {
      success: false,
      message: 'קרתה שגיאה. בואי נסתכל לך שוב.',
    }
  }
}
