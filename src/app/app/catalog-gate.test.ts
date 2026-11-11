import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'

/**
 * The catalogue's category pages, product pages and search, opened by URL by a
 * visitor who has not registered. Product pages and search give the sign-up
 * prompt and read nothing. A category page shows each product's photo and name
 * only (owner, 2026-11-11): no supplier, no price, no weekly promotion.
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
        offers: [{ supplierId: 's1', supplierName: 'SECRET-SUPPLIER', price: 123.45, suggested: true }],
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
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    state.reads.push('supabase')
    throw new Error('no database in this test')
  },
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/server', () => ({ after: () => undefined }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))

const CatalogLocked = (await import('@/components/app/CatalogLocked')).default
const PublicProductGrid = (await import('@/components/app/PublicProductGrid')).default
const ProductList = (await import('@/components/app/ProductList')).default
const CatalogPage = (await import('./catalog/page')).default
const CategoryPage = (await import('./catalog/[id]/page')).default
const ProductPage = (await import('./product/[id]/page')).default

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
  it('a category page shows photo and name only: no supplier, price, brand or promotion', async () => {
    const page = await CategoryPage({ params: Promise.resolve({ id: 'top1' }), searchParams: Promise.resolve({}) })
    const grid = find(page, PublicProductGrid)
    expect(grid).not.toBeNull()
    expect(contains(page, ProductList)).toBe(false)
    expect(grid!.props).toEqual({ products: [{ id: 'p1', name: 'דבק לעץ', imageUrl: 'https://example.test/p1.jpg', icon: 'glue' }] })
    expect(JSON.stringify(grid!.props)).not.toMatch(/SECRET|123\.45/)
    expect(state.reads).not.toContain('promo')
  })

  it('a product page by URL shows the sign-up prompt and reads nothing', async () => {
    const page = await ProductPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, CatalogLocked)).toBe(true)
    expect(state.reads).toEqual([])
  })

  it('a search shows the sign-up prompt and reads no products', async () => {
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'דבק' }) })
    expect(contains(page, CatalogLocked)).toBe(true)
    expect(state.reads).toEqual([])
  })

  it('the catalogue itself still lists the categories', async () => {
    const page = await CatalogPage({ searchParams: Promise.resolve({}) })
    expect(contains(page, CatalogLocked)).toBe(false)
    expect(state.reads).toContain('categories')
  })
})

describe('catalogue for a registered viewer', () => {
  it('a category page shows its products, not the prompt', async () => {
    state.mayBrowse = true
    const page = await CategoryPage({ params: Promise.resolve({ id: 'top1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, CatalogLocked)).toBe(false)
    expect(state.reads).toContain('products')
  })

  it('a search runs, not the prompt', async () => {
    state.mayBrowse = true
    const page = await CatalogPage({ searchParams: Promise.resolve({ q: 'דבק' }) })
    expect(contains(page, CatalogLocked)).toBe(false)
    expect(state.reads).toContain('products')
  })
})
