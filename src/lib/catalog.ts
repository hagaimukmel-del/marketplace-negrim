/**
 * Reading the catalogue, now that a product and its price are two things.
 *
 * A product says what the item IS; an offer says what one supplier charges for
 * it. Every screen that shows a price has to pick an offer, and that choice -
 * cheapest, in stock, fastest - is a product decision, not a rendering detail.
 * It lives here once so it cannot drift between the catalogue, the offer page
 * and the order that gets written.
 */

/** Closed vocabulary, matching the check constraint on products.base_unit. */
export const BASE_UNITS = {
  unit: 'יח׳',
  kg: 'ק״ג',
  liter: 'ליטר',
  meter: 'מטר',
  sqm: 'מ״ר',
} as const

export type BaseUnit = keyof typeof BASE_UNITS

export function unitLabel(baseUnit: string | null | undefined): string {
  return BASE_UNITS[(baseUnit ?? 'unit') as BaseUnit] ?? BASE_UNITS.unit
}

export interface Offer {
  id: string
  supplier_id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  min_order_qty: number
  lead_time_days: number | null
  suppliers?: { company_name: string } | null
}

export interface CatalogProduct {
  id: string
  name_he: string
  name_en: string | null
  description_he: string | null
  image_url: string | null
  category_id: string | null
  brand: string | null
  mpn: string | null
  base_unit: string
  supplier_offers: Offer[]
}

export const OFFER_COLUMNS =
  'id, supplier_id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, min_order_qty, lead_time_days'

/**
 * `!inner` is what keeps a product with no live offer out of the catalogue.
 * Nobody sells it, so there is nothing to show and no price to show it at.
 */
export const CATALOG_COLUMNS =
  'id, name_he, name_en, description_he, image_url, category_id, brand, mpn, base_unit, ' +
  `supplier_offers!inner(${OFFER_COLUMNS})`

/**
 * Server-side only. `suppliers` has RLS on with no policy, so the browser key
 * reads the embed as undefined rather than failing - a silent blank instead of
 * an error, which is exactly the kind of thing that ships.
 */
export const CATALOG_COLUMNS_WITH_SUPPLIER =
  'id, name_he, name_en, description_he, image_url, category_id, brand, mpn, base_unit, ' +
  `supplier_offers!inner(${OFFER_COLUMNS}, suppliers(company_name))`

/**
 * Which offer the carpenter is shown.
 *
 * In stock beats out of stock, then cheapest wins - a price you cannot
 * actually buy at is worse than a higher one you can. With one supplier this
 * is simply the only offer; the rule matters from the second onwards.
 */
export function bestOffer(product: { supplier_offers?: Offer[] | null }): Offer | null {
  const offers = product.supplier_offers ?? []
  if (offers.length === 0) return null

  return offers.reduce((best, offer) => {
    const bestInStock = best.stock_qty > 0
    const offerInStock = offer.stock_qty > 0
    if (offerInStock !== bestInStock) return offerInStock ? offer : best
    return Number(offer.price_excl_vat) < Number(best.price_excl_vat) ? offer : best
  })
}

export function priceOf(product: { supplier_offers?: Offer[] | null }): number {
  return Number(bestOffer(product)?.price_excl_vat ?? 0)
}

export function inStock(product: { supplier_offers?: Offer[] | null }): boolean {
  return (product.supplier_offers ?? []).some((offer) => offer.stock_qty > 0)
}

/** How many suppliers carry this. Drives "3 ספקים · מ-₪45". */
export function offerCount(product: { supplier_offers?: Offer[] | null }): number {
  return (product.supplier_offers ?? []).length
}

/**
 * "קרטון 25 יח׳" - what you actually take off the shelf, when the supplier has
 * said. Returns null when there is no pack, so callers render nothing rather
 * than an empty pair of parentheses.
 */
export function packLabel(offer: Offer | null, baseUnit: string): string | null {
  if (!offer?.pack_label) return null
  if (!offer.pack_qty) return offer.pack_label
  return `${offer.pack_label} ${offer.pack_qty} ${unitLabel(baseUnit)}`
}

/** Cheapest first, out-of-stock last. Used wherever a list is rendered. */
export function byPrice(a: CatalogProduct, b: CatalogProduct): number {
  const aStock = inStock(a)
  const bStock = inStock(b)
  if (aStock !== bStock) return aStock ? -1 : 1
  return priceOf(a) - priceOf(b)
}
