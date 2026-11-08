import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  carpenter: null as null | { id: string; city: string | null },
  admin: false,
  supplier: null as null | { id: string },
  supplierReads: 0,
}))

vi.mock('@/lib/carpenter-auth', () => ({ getSessionCarpenter: async () => state.carpenter }))
vi.mock('@/lib/admin-auth', () => ({ isAdmin: async () => state.admin }))
vi.mock('@/lib/supplier-auth', () => ({
  getSessionSupplier: async () => {
    state.supplierReads++
    return state.supplier
  },
}))

const { loadCatalogViewer } = await import('./catalog-access')

beforeEach(() => {
  state.carpenter = null
  state.admin = false
  state.supplier = null
  state.supplierReads = 0
})

describe('loadCatalogViewer', () => {
  it('keeps a visitor who has not registered out of products and prices', async () => {
    const viewer = await loadCatalogViewer()
    expect(viewer.mayBrowse).toBe(false)
    expect(viewer.showPrices).toBe(false)
  })

  it('lets a signed-in carpentry browse and see prices', async () => {
    state.carpenter = { id: 'C1', city: 'חיפה' }
    const viewer = await loadCatalogViewer()
    expect(viewer).toMatchObject({ mayBrowse: true, showPrices: true, supplier: false })
    expect(state.supplierReads).toBe(0)
  })

  it('lets the operator browse and see prices', async () => {
    state.admin = true
    expect(await loadCatalogViewer()).toMatchObject({ mayBrowse: true, showPrices: true })
  })

  it('lets an approved supplier browse, without prices', async () => {
    state.supplier = { id: 'S1' }
    const viewer = await loadCatalogViewer()
    expect(viewer).toMatchObject({ mayBrowse: true, showPrices: false, supplier: true })
  })
})
