import { describe, expect, it } from 'vitest'
import { NO_FILTERS, applyFilters, filterOptions, filtersToParams, parseFilters, priceRanges, roundPrice } from './catalog-filters'
import type { AppOffer, AppProduct } from './products'

const offer = (supplierId: string, price: number | null, regions: string[] = []): AppOffer => ({
  supplierId,
  supplierName: `ספק ${supplierId}`,
  supplierLogo: null,
  supplierRegions: regions,
  price,
  quoteOnly: price == null,
  packLabel: null,
  packQty: null,
  inStock: true,
  leadDays: null,
  terms: [],
  minOrder: null,
  minOrderQty: 1,
  specialMinQty: null,
  delivers: null,
  suggested: true,
})

const product = (id: string, extra: Partial<AppProduct> = {}, offers: AppOffer[] = [offer('a', 10)]): AppProduct => ({
  id,
  name: id,
  brand: null,
  mpn: null,
  baseUnit: 'unit',
  unit: 'יח׳',
  imageUrl: null,
  attributes: [],
  categoryId: null,
  icon: null,
  topId: null,
  subId: null,
  description: null,
  createdAt: null,
  popularRank: null,
  offers,
  ...extra,
})

const ids = (list: AppProduct[]) => list.map((p) => p.id)

describe('catalogue filters', () => {
  const list = [
    product('cheap', { imageUrl: 'x.jpg', popularRank: 2, createdAt: '2026-10-01', brand: 'Kleiberit' }, [offer('a', 5, ['center'])]),
    product('dear', { popularRank: 0, createdAt: '2026-10-20', brand: 'Henkel' }, [offer('b', 300, ['north'])]),
    product('quote', { imageUrl: 'y.jpg', popularRank: 1, createdAt: '2026-09-01' }, [offer('a', null, ['center'])]),
    product('mid', { createdAt: '2026-10-10', brand: 'Kleiberit' }, [offer('a', 40, ['center']), offer('b', 50, ['north'])]),
  ]

  it('sorts by price both ways with price-on-request last', () => {
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price' }))).toEqual(['cheap', 'mid', 'dear', 'quote'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price-desc' }))).toEqual(['dear', 'mid', 'cheap', 'quote'])
  })

  it('sorts by views, newest, and photo first for "מומלץ"', () => {
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'popular' }))).toEqual(['dear', 'quote', 'cheap', 'mid'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'new' }))).toEqual(['dear', 'mid', 'cheap', 'quote'])
    expect(ids(applyFilters(list, NO_FILTERS))).toEqual(['quote', 'cheap', 'dear', 'mid'])
  })

  it('filters by photo, price range, supplier, region and brand', () => {
    expect(ids(applyFilters(list, { ...NO_FILTERS, withImage: true }))).toEqual(['quote', 'cheap'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price', minPrice: 10, maxPrice: 100 }))).toEqual(['mid'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price', suppliers: ['b'] }))).toEqual(['mid', 'dear'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price', regions: ['north'] }))).toEqual(['mid', 'dear'])
    expect(ids(applyFilters(list, { ...NO_FILTERS, sort: 'price', brands: ['Kleiberit'] }))).toEqual(['cheap', 'mid'])
  })

  it('round-trips through the URL and keeps other params', () => {
    const filters = { ...NO_FILTERS, sort: 'popular' as const, withImage: true, minPrice: 10, suppliers: ['a', 'b'], regions: ['north'] }
    const params = filtersToParams(filters, new URLSearchParams('q=דבק&b=x'))
    expect(params.get('q')).toBe('דבק')
    expect(params.get('b')).toBe('x')
    expect(parseFilters(params)).toEqual(filters)
    expect(filtersToParams(NO_FILTERS, new URLSearchParams('q=a&sort=new')).toString()).toBe('q=a')
    expect(parseFilters(new URLSearchParams('sort=nonsense&min=-3')).sort).toBe('best')
    expect(parseFilters(new URLSearchParams('min=-3')).minPrice).toBeNull()
  })

  it('offers only filters that would split the list', () => {
    const options = filterOptions(list)
    expect(options.suppliers.map((s) => s.id)).toEqual(['a', 'b'])
    expect(options.regions.map((r) => r.key)).toEqual(['north', 'center'])
    expect(options.brands.map((b) => b.name)).toEqual(['Kleiberit', 'Henkel'])
    expect(options.imageSplit).toBe(true)

    const single = filterOptions([product('1'), product('2')])
    expect(single.suppliers).toEqual([])
    expect(single.regions).toEqual([])
    expect(single.imageSplit).toBe(false)
  })
})

describe('price ranges', () => {
  it('rounds to 1, 2 or 5 times a power of ten', () => {
    expect(roundPrice(37)).toBe(50)
    expect(roundPrice(140)).toBe(100)
    expect(roundPrice(180)).toBe(200)
    expect(roundPrice(8)).toBe(10)
  })

  it('splits at the thirds, and not at all for a short list', () => {
    expect(priceRanges([1, 2, 3])).toEqual([])
    const ranges = priceRanges([8, 12, 20, 35, 60, 90, 150, 400, 1200])
    expect(ranges.map((r) => [r.min, r.max])).toEqual([
      [null, 50],
      [50, 200],
      [200, null],
    ])
  })
})
