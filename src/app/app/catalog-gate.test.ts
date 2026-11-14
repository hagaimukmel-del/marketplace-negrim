import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'

/**
 * The catalogue's category pages, product pages and search, opened by URL by a
 * visitor who has not registered, and a supplier's page. Since 2026-11-12
 * (owner) supplier names are public and prices and terms are not: a category
 * page and a search show each product's photo, name and supplier; a product
 * page shows the product and who sells it with no price or terms; a supplier
 * page shows who the supplier is but not its terms.
 */

const state = vi.hoisted(() => ({
  mayBrowse: false,
  reads: [] as string[],
}))

vi.mock('@/lib/app/catalog-access', () => ({
  loadCatalogViewer: async () => ({
    carpenter: state.mayBrowse ? { id: 'C1', city: null } : null,
    admin: false,
    supplier: false,
    mayBrowse: state.mayBrowse,
    showPrices: state.mayBrowse,
  }),
}))
vi.mock('@/lib/app/catalog-server', () => ({
  loadProducts: async () => {
    state.reads.push('products')
    return [
      {
        id: 'p1', name: 'דבק לעץ', brand: 'SECRET-BRAND', mpn: 'SECRET-MPN', baseUnit: 'kg', unit: 'ק״ג',
        imageUrl: 'https://example.test/p1.jpg', attributes: [], categoryId: 'top1', icon: 'glue', topId: 'top1', subId: null,
        description: null, createdAt: null, popularRank: 0,
        offers: [{ supplierId: 's1', supplierName: 'ספק א', supplierLogo: null, price: 123.45, suggested: true, terms: ['SECRET-TERMS'], minOrder: 999, leadDays: 4, minOrderQty: 5, specialMinQty: 50, delivers: true }],
      },
    ]
  },
  loadCategoryTree: async () => {
    state.reads.push('categories')
    return [{ id: 'top1', name: 'דבקים', icon: null, count: 1, children: [] }]
  },
  recordProductView: async () => undefined,
}))
vi.mock('@/lib/promo', () => ({
  loadCurrentPromo: async () => {
    state.reads.push('promo')
    return null
  },
  promotedSlot: () => null,
}))
// Any table read answers "nothing": chainable, and awaitable as { data: [] }.
function emptyQuery(): unknown {
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'neq', 'in', 'like', 'order', 'limit']) query[name] = () => query
  query.maybeSingle = async () => ({ data: null })
  query.then = (resolve: (value: { data: unknown[] }) => unknown) => resolve({ data: [] })
  return query
}
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    state.reads.push('supabase')
    return { from: () => emptyQuery() }
  },
}))
const supplier = { id: 's1', name: 'ספק א', logoUrl: null, city: 'חולון', about: 'דבקים לנגרות', regions: [], productCount: 1 }
vi.mock('@/lib/app/suppliers-public', async (load) => ({
  ...(await load<typeof import('@/lib/app/suppliers-public')>()),
  loadPublicSuppliers: async () => [supplier],
  loadPublicSupplier: async (id: string) =>
    id === 's1' ? { supplier, terms: { paymentTerms: ['SECRET-TERMS'], minOrder: 999, leadDays: 4, freeDeliveryFrom: 777 } } : null,
  loadSupplierCatalogs: async () => [],
  recordSupplierView: async () => undefined,
}))
// Supplier s1 can be reached; its number must reach a registered viewer only.
vi.mock('@/lib/supplier-contact-server', () => ({
  loadSupplierContacts: async () => new Map([['s1', { phone: '050-111-2222', whatsapp: '050-111-2222' }]]),
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/server', () => ({ after: () => undefined }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))

const PublicProductGrid = (await import('@/components/app/PublicProductGrid')).default
const ProductList = (await import('@/components/app/ProductList')).default
const CatalogPage = (await import('./catalog/page')).default
const CategoryPage = (await import('./catalog/[id]/page')).default
const ProductPage = (await import('./product/[id]/page')).default
const ProductView = (await import('./product/[id]/ProductView')).default
const SupplierPage = (await import('./suppliers/[id]/page')).default
const SuppliersPage = (await import('./suppliers/page')).default
const SupplierCard = (await import('@/components/app/SupplierCard')).default
const SupplierContactButtons = (await import('@/components/app/SupplierContactButtons')).default

/** The first element of this component type in a rendered tree, or null. */
function find(node: ReactNode, type: unknown): { props: Record<string, unknown> } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, type)
      if (hit) return hit
    }
    return null
  }
  if (!isValidElement(node)) return null
  if (node.type === type) return { props: node.props as Record<string, unknown> }
  return find((node.props as { children?: ReactNode }).children, type)
}

/** Every string and number in a rendered tree, its text and its props alike. */
function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  if (!isValidElement(node)) return ''
  return Object.values(node.props as Record<string, unknown>).map(textOf).join(' ')
}

/** Whether a rendered tree contains an element of this component type. */
function contains(node: ReactNode, type: unknown): boolean {
  if (Array.isArray(node)) return node.some((child) => contains(child, type))
  if (!isValidElement(node)) return false
  if (node.type === type) return true
  return contains((node.props as { children?: ReactNode }).children, type)
}

beforeEach(() => {
  state.mayBrowse = false
  state.reads = []
})

describe('catalogue for a visitor who has not registered', () => {
  const visible = { id: 'p1', name: 'דבק לעץ', imageUrl: 'https://example.test/p1.jpg', icon: 'glue', supplierName: 'ספק א', supplierLogo: null }

  it('a category page shows photo, name and supplier: no price, brand or promotion', async () => {
    const page = await CategoryPage({ params: Promise.resolve({ id: 'top1' }), searchParams: Promise.resolve({}) })
    const grid = find(page, PublicProductGrid)
    expect(grid).not.toBeNull()
    expect(contains(page, ProductList)).toBe(false)
    expect(grid!.props).toEqual({ products: [visible] })
    expect(JSON.stringify(grid!.props)).not.toMatch(/SECRET|123\.45/)
    expect(state.reads).not.toContain('promo')
  })

  it('a product page shows the product and its supplier, with no price or terms', async () => {
    const page = await ProductPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve({}) })
    const view = find(page, ProductView)
    expect(view).not.toBeNull()
    expect(view!.props.visitor).toBe(true)
    expect(view!.props.showPrices).toBe(false)
    const offers = (view!.props.product as { offers: Record<string, unknown>[] }).offers
    expect(offers[0]).toMatchObject({ supplierName: 'ספק א', price: null, terms: [], minOrder: null, leadDays: null, specialMinQty: null })
    expect(JSON.stringify(view!.props)).not.toMatch(/SECRET-TERMS|123\.45|999/)
  })

  it('a product page offers contact through registration, never the number', async () => {
    const page = await ProductPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve({}) })
    const view = find(page, ProductView)!
    expect(view.props.contacts).toEqual({})
    expect(view.props.contactable).toEqual(['s1'])
    expect(JSON.stringify(view.props)).not.toContain('111-2222')
  })

  it('a supplier page offers contact through registration and back, never the number', async () => {
    const page = await SupplierPage({ params: Promise.resolve({ id: 's1' }), searchParams: Promise.resolve({}) })
    const buttons = find(page, SupplierContactButtons)!
    expect(buttons.props.contact).toBeNull()
    expect(buttons.props.joinHref).toBe(`/join?next=${encodeURIComponent('/app/suppliers/s1?contact=1')}`)
    expect(textOf(page)).not.toContain('111-2222')
  })

  it('a supplier page shows who the supplier is and its products, not its terms', async () => {
    const page = await SupplierPage({ params: Promise.resolve({ id: 's1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, PublicProductGrid)).toBe(true)
    expect(contains(page, ProductList)).toBe(false)
    const text = textOf(page)
    expect(text).toContain('דבקים לנגרות')
    expect(text).not.toMatch(/SECRET|123\.45|999|777/)
  })

  it('a search that names a supplier shows its card', async () => {
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'ספק' }) })
    expect(find(page, SupplierCard)!.props).toEqual({ supplier })
  })

  it('the supplier list gives a visitor no WhatsApp number', async () => {
    const page = await SuppliersPage()
    expect(find(page, SupplierCard)!.props).toEqual({ supplier })
    expect(textOf(page)).not.toContain('050-111-2222')
  })

  it('a search finds products and shows photo, name and supplier only', async () => {
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'דבק' }) })
    const grid = find(page, PublicProductGrid)
    expect(grid).not.toBeNull()
    expect(contains(page, ProductList)).toBe(false)
    expect(grid!.props).toEqual({ products: [visible] })
    expect(JSON.stringify(grid!.props)).not.toMatch(/SECRET|123\.45/)
  })

  it('a search by supplier name finds that supplier\'s products', async () => {
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'ספק א' }) })
    expect(find(page, PublicProductGrid)!.props).toEqual({ products: [visible] })
  })

  it('the catalogue itself still lists the categories', async () => {
    await CatalogPage({ searchParams: Promise.resolve({}) })
    expect(state.reads).toContain('categories')
  })
})

describe('catalogue for a registered viewer', () => {
  it('a category page shows its products, not the visitor grid', async () => {
    state.mayBrowse = true
    const page = await CategoryPage({ params: Promise.resolve({ id: 'top1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, PublicProductGrid)).toBe(false)
    expect(state.reads).toContain('products')
  })

  it('a supplier page shows its terms and the full product list', async () => {
    state.mayBrowse = true
    const page = await SupplierPage({ params: Promise.resolve({ id: 's1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, ProductList)).toBe(true)
    expect(textOf(page)).toContain('SECRET-TERMS')
    expect(find(page, SupplierContactButtons)!.props).toMatchObject({ contact: { whatsapp: '050-111-2222' }, joinHref: null, source: 'supplier' })
  })

  it('a product page gives the numbers of the suppliers that sell it', async () => {
    state.mayBrowse = true
    const page = await ProductPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve({ contact: '1' }) })
    const view = find(page, ProductView)!
    expect(view.props.contacts).toEqual({ s1: { phone: '050-111-2222', whatsapp: '050-111-2222' } })
    expect(view.props.contactable).toEqual([])
    expect(view.props.justJoined).toBe(true)
  })

  it('the supplier list and a search put WhatsApp on the supplier\'s card', async () => {
    state.mayBrowse = true
    const list = await SuppliersPage()
    expect(find(list, SupplierCard)!.props).toEqual({ supplier, whatsapp: '050-111-2222' })
    const search = await CatalogPage({ searchParams: Promise.resolve({ q: 'ספק' }) })
    expect(find(search, SupplierCard)!.props).toEqual({ supplier, whatsapp: '050-111-2222' })
  })

  it('a search shows the full product list, not the visitor grid', async () => {
    state.mayBrowse = true
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'דבק' }) })
    expect(contains(page, ProductList)).toBe(true)
    expect(contains(page, PublicProductGrid)).toBe(false)
    expect(state.reads).toContain('products')
  })
})
