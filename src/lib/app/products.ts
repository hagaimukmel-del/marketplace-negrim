/**
 * A product and its offers as the purchasing app reads them. Client-safe.
 */

export interface AppOffer {
  supplierId: string
  supplierName: string
  supplierLogo: string | null
  /** Regions the supplier sits in or delivers to (lib/regions keys); empty when unknown. */
  supplierRegions: string[]
  /** Per base unit, excl VAT. Null when this viewer may not see prices, or the supplier quotes only. */
  price: number | null
  /** The supplier chose "רק הצעת מחיר": the carpenter asks for a quote instead of adding to the cart (T-023). */
  quoteOnly: boolean
  packLabel: string | null
  packQty: number | null
  inStock: boolean
  leadDays: number | null
  terms: string[]
  minOrder: number | null
  /** The offer's minimum order, in base units. */
  minOrderQty: number
  /**
   * From what quantity, in base units, a special price may be asked for
   * (stage 1 RFQ rules). Null: no special price on this offer, or the supplier
   * quotes only, or the pack size changed and the supplier has not confirmed it.
   */
  specialMinQty: number | null
  /** Whether the supplier delivers to this carpentry's region; null when either side is unknown. */
  delivers: boolean | null
  /** The offer the catalogue suggests: among suppliers that reach this carpentry, in stock first, then cheapest. */
  suggested: boolean
}

export interface AppProduct {
  id: string
  name: string
  brand: string | null
  mpn: string | null
  /** The platform's base unit key (unit/kg/liter/meter/sqm); `unit` is its Hebrew label. */
  baseUnit: string
  unit: string
  imageUrl: string | null
  attributes: [string, string][]
  categoryId: string | null
  /** The main category's icon key, for the product tile. */
  icon: string | null
  topId: string | null
  subId: string | null
  /** The product's own description, when it has one. */
  description: string | null
  createdAt: string | null
  /** 0 is the most viewed product in the catalogue; null when popularity was not loaded. */
  popularRank: number | null
  offers: AppOffer[]
}

export function suggestedOffer(product: AppProduct): AppOffer | null {
  return product.offers.find((offer) => offer.suggested) ?? product.offers[0] ?? null
}

/** The order suppliers are listed in when choosing: the catalogue's own rule. */
export function sortedOffers(product: AppProduct): AppOffer[] {
  return [...product.offers].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    // A price-on-request offer sorts after every priced one.
    if (a.price == null || b.price == null) return a.price == null ? (b.price == null ? 0 : 1) : -1
    return a.price - b.price
  })
}

/** One step of the quantity stepper, in base units: a pack when the supplier sells in packs. */
export function stepOf(offer: Pick<AppOffer, 'packQty'> | null): number {
  return offer?.packQty && offer.packQty > 0 ? offer.packQty : 1
}

export interface CategoryNode {
  id: string
  name: string
  icon: string | null
  count: number
  children: { id: string; name: string; count: number }[]
}
