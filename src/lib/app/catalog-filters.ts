/**
 * Filtering and sorting a list of catalogue products. Client-safe and pure:
 * the list component keeps the state in the URL, this file decides what it
 * means. Prices are per base unit excl VAT, from the offer the card shows.
 */

import { REGIONS } from '@/lib/regions'
import { suggestedOffer, type AppProduct } from './products'

export const SORTS = [
  { key: 'best', label: 'מומלץ' },
  { key: 'price', label: 'מחיר: מהזול' },
  { key: 'price-desc', label: 'מחיר: מהיקר' },
  { key: 'popular', label: 'הכי נצפים' },
  { key: 'new', label: 'חדשים' },
] as const

export type SortKey = (typeof SORTS)[number]['key']

export interface CatalogFilters {
  sort: SortKey
  withImage: boolean
  minPrice: number | null
  maxPrice: number | null
  suppliers: string[]
  regions: string[]
  brands: string[]
}

export const NO_FILTERS: CatalogFilters = { sort: 'best', withImage: false, minPrice: null, maxPrice: null, suppliers: [], regions: [], brands: [] }

/** The URL keys this file owns; every other search param is left as it is. */
const KEYS = ['sort', 'img', 'min', 'max', 'sup', 'reg', 'brand'] as const

function isSort(value: string | null): value is SortKey {
  return SORTS.some((sort) => sort.key === value)
}

function price(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function list(value: string | null): string[] {
  return value ? value.split(',').map((part) => part.trim()).filter(Boolean) : []
}

export function parseFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get('sort')
  return {
    sort: isSort(sort) ? sort : 'best',
    withImage: params.get('img') === '1',
    minPrice: price(params.get('min')),
    maxPrice: price(params.get('max')),
    suppliers: list(params.get('sup')),
    regions: list(params.get('reg')),
    brands: list(params.get('brand')),
  }
}

/** `base` with this file's keys replaced by `filters`; a default value is left out of the URL. */
export function filtersToParams(filters: CatalogFilters, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base)
  for (const key of KEYS) params.delete(key)
  if (filters.sort !== 'best') params.set('sort', filters.sort)
  if (filters.withImage) params.set('img', '1')
  if (filters.minPrice != null) params.set('min', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('max', String(filters.maxPrice))
  if (filters.suppliers.length) params.set('sup', filters.suppliers.join(','))
  if (filters.regions.length) params.set('reg', filters.regions.join(','))
  if (filters.brands.length) params.set('brand', filters.brands.join(','))
  return params
}

/** How many filters are on, for the badge on the filter button. The sort is not a filter. */
export function activeCount(filters: CatalogFilters): number {
  return (
    (filters.withImage ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.suppliers.length ? 1 : 0) +
    (filters.regions.length ? 1 : 0) +
    (filters.brands.length ? 1 : 0)
  )
}

function unitPrice(product: AppProduct): number | null {
  return suggestedOffer(product)?.price ?? null
}

/**
 * The filtered, sorted list. A price range only keeps products with a price
 * in it, so price-on-request products drop out while one is set. Supplier and
 * region match any offer, not only the one on the card.
 */
export function applyFilters(products: AppProduct[], filters: CatalogFilters): AppProduct[] {
  const suppliers = new Set(filters.suppliers)
  const regions = new Set(filters.regions)
  const brands = new Set(filters.brands)
  const ranged = filters.minPrice != null || filters.maxPrice != null

  const kept = products.filter((product) => {
    if (filters.withImage && !product.imageUrl) return false
    if (ranged) {
      const p = unitPrice(product)
      if (p == null) return false
      if (filters.minPrice != null && p < filters.minPrice) return false
      if (filters.maxPrice != null && p > filters.maxPrice) return false
    }
    if (suppliers.size && !product.offers.some((offer) => suppliers.has(offer.supplierId))) return false
    if (regions.size && !product.offers.some((offer) => offer.supplierRegions.some((region) => regions.has(region)))) return false
    if (brands.size && !(product.brand && brands.has(product.brand))) return false
    return true
  })

  // Every sort is stable and falls back to the list's own order.
  const order = new Map(products.map((product, index) => [product.id, index]))
  const byOrder = (a: AppProduct, b: AppProduct) => order.get(a.id)! - order.get(b.id)!
  const byRank = (a: AppProduct, b: AppProduct) => (a.popularRank ?? Infinity) - (b.popularRank ?? Infinity) || byOrder(a, b)
  // A price on request sorts after every priced product, both ways.
  const byPrice = (dir: 1 | -1) => (a: AppProduct, b: AppProduct) => {
    const pa = unitPrice(a)
    const pb = unitPrice(b)
    if (pa == null || pb == null) return (pa == null ? 1 : 0) - (pb == null ? 1 : 0) || byOrder(a, b)
    return (pa - pb) * dir || byOrder(a, b)
  }

  switch (filters.sort) {
    case 'price':
      return kept.sort(byPrice(1))
    case 'price-desc':
      return kept.sort(byPrice(-1))
    case 'popular':
      return kept.sort(byRank)
    case 'new':
      return kept.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || byOrder(a, b))
    default:
      // A photo first (the catalogue is led by photos), then the most viewed.
      return kept.sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) || byRank(a, b))
  }
}

export interface FilterOptions {
  suppliers: { id: string; name: string; count: number }[]
  regions: { key: string; name: string; count: number }[]
  brands: { name: string; count: number }[]
  /** Suggested price ranges, from the prices in this list; empty when there are too few prices. */
  priceRanges: { min: number | null; max: number | null; label: string }[]
  /** Whether "עם תמונה" would change anything: some products have a photo and some do not. */
  imageSplit: boolean
}

/** What can be filtered on in this list. A filter with one value or none is not worth offering. */
export function filterOptions(products: AppProduct[]): FilterOptions {
  const suppliers = new Map<string, { id: string; name: string; count: number }>()
  const regions = new Map<string, number>()
  const brands = new Map<string, number>()
  for (const product of products) {
    const seenSupplier = new Set<string>()
    const seenRegion = new Set<string>()
    for (const offer of product.offers) {
      if (!seenSupplier.has(offer.supplierId)) {
        seenSupplier.add(offer.supplierId)
        const entry = suppliers.get(offer.supplierId) ?? { id: offer.supplierId, name: offer.supplierName, count: 0 }
        entry.count += 1
        suppliers.set(offer.supplierId, entry)
      }
      for (const region of offer.supplierRegions) seenRegion.add(region)
    }
    for (const region of seenRegion) regions.set(region, (regions.get(region) ?? 0) + 1)
    if (product.brand) brands.set(product.brand, (brands.get(product.brand) ?? 0) + 1)
  }
  const withImage = products.filter((product) => product.imageUrl).length
  const prices = products.map(unitPrice).filter((p): p is number => p != null)

  return {
    suppliers: suppliers.size > 1 ? [...suppliers.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'he')) : [],
    // In the regions' own order, north to south. One region for every product filters nothing.
    regions:
      regions.size > 1 || [...regions.values()].some((count) => count < products.length)
        ? REGIONS.filter((region) => regions.has(region.key)).map((region) => ({ key: region.key, name: region.name, count: regions.get(region.key)! }))
        : [],
    brands: brands.size > 1 ? [...brands.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'he')) : [],
    priceRanges: priceRanges(prices),
    imageSplit: withImage > 0 && withImage < products.length,
  }
}

/** The round number nearest `n` (by ratio): 1, 2 or 5 times a power of ten. */
export function roundPrice(n: number): number {
  if (n <= 0) return 0
  const power = 10 ** Math.floor(Math.log10(n))
  const distance = (m: number) => Math.abs(Math.log(n / (m * power)))
  return [1, 2, 5, 10].reduce((best, m) => (distance(m) < distance(best) ? m : best)) * power
}

/** Three ranges split at the list's thirds, on round numbers, so each holds a fair share of it. */
export function priceRanges(prices: number[]): { min: number | null; max: number | null; label: string }[] {
  if (prices.length < 6) return []
  const sorted = [...prices].sort((a, b) => a - b)
  const low = roundPrice(sorted[Math.floor(sorted.length / 3)])
  const high = roundPrice(sorted[Math.floor((sorted.length * 2) / 3)])
  if (!(low > 0) || high <= low) return []
  const n = (value: number) => value.toLocaleString('he-IL')
  return [
    { min: null, max: low, label: `עד ₪${n(low)}` },
    { min: low, max: high, label: `₪${n(low)}–${n(high)}` },
    { min: high, max: null, label: `מעל ₪${n(high)}` },
  ]
}
