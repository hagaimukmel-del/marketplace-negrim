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
  if (hebrew.includes('דבק') || hebrew.includes('glue') || hebrew.includes('adhesive') || hebrew.includes('דבקים') || hebrew.includes('דביק')) {
    intent.category = 'adhesive'
    intent.confidence += 0.2
  } else if (
    hebrew.includes('צבע') ||
    hebrew.includes('פוליש') ||
    hebrew.includes('varnish') ||
    hebrew.includes('צבעים') ||
    hebrew.includes('צביעה') ||
    hebrew.includes('לכה')
  ) {
    intent.category = 'finishing'
    intent.confidence += 0.2
  } else if (hebrew.includes('כלי') || hebrew.includes('tool') || hebrew.includes('כלים')) {
    intent.category = 'tool'
    intent.confidence += 0.2
  }

  // Product types (קנקוטיים, לוחות, וכו')
  if (hebrew.includes('קנקוט') || hebrew.includes('canister')) {
    intent.category = 'adhesive'
    intent.confidence += 0.15
  } else if (hebrew.includes('לוח') || hebrew.includes('board')) {
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
      if (productName.includes(intent.category) || description.includes(intent.category)) {
        confidence += 0.4
      }
    }

    // Match material keywords
    if (intent.material) {
      if (combined.includes(intent.material)) {
        confidence += 0.3
      }
    }

    // Match application keywords
    if (intent.application) {
      if (combined.includes(intent.application)) {
        confidence += 0.2
      }
    }

    // Only keep products with some match
    if (confidence > 0) {
      productMap.set(product.id, {
        productId: product.id,
        productName: product.name_he || product.name_en || 'Unknown',
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

    // Step 5: Fetch supplier documents for citations
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

    // Step 5: Show if documents exist
    if (product.documents && product.documents.length > 0) {
      response += ` 📄`
    }

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
