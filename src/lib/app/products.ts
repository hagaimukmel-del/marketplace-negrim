/**
 * A product and its offers as the purchasing app reads them. Client-safe.
 */

export interface AppOffer {
  supplierId: string
  supplierName: string
  /** Per base unit, excl VAT. Null when this viewer may not see prices. */
  price: number | null
  packLabel: string | null
  packQty: number | null
  inStock: boolean
  leadDays: number | null
  terms: string[]
  minOrder: number | null
  /** The offer the catalogue suggests: in stock first, then cheapest (lib/catalog bestOffer). */
  suggested: boolean
}

export interface AppProduct {
  id: string
  name: string
  brand: string | null
  mpn: string | null
  unit: string
  imageUrl: string | null
  attributes: [string, string][]
  categoryId: string | null
  /** The main category's icon key, for the product tile. */
  icon: string | null
  topId: string | null
  subId: string | null
  offers: AppOffer[]
}

export function suggestedOffer(product: AppProduct): AppOffer | null {
  return product.offers.find((offer) => offer.suggested) ?? product.offers[0] ?? null
}

/** The order suppliers are listed in when choosing: the catalogue's own rule. */
export function sortedOffers(product: AppProduct): AppOffer[] {
  return [...product.offers].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    return (a.price ?? 0) - (b.price ?? 0)
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
