import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'

/**
 * The catalogue's category pages, product pages and search, opened by URL by a
 * visitor who has not registered: they get the sign-up prompt, and nothing
 * about products, suppliers or the weekly promotion is read for them.
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
    return []
  },
  loadCategoryTree: async () => {
    state.reads.push('categories')
    return [{ id: 'top1', name: 'דבקים', icon: null, count: 0, children: [] }]
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
const CatalogPage = (await import('./catalog/page')).default
const CategoryPage = (await import('./catalog/[id]/page')).default
const ProductPage = (await import('./product/[id]/page')).default

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
  it('a category page by URL shows the sign-up prompt and reads no products', async () => {
    const page = await CategoryPage({ params: Promise.resolve({ id: 'top1' }), searchParams: Promise.resolve({}) })
    expect(contains(page, CatalogLocked)).toBe(true)
    expect(state.reads).toEqual([])
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
