import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/email'
import { loadProducts } from '@/lib/app/catalog-server'
import { loadPublicSuppliers } from '@/lib/app/suppliers-public'

export const dynamic = 'force-dynamic'

/**
 * The public entry points: the landing page, both sign-ups, the terms, and the
 * supplier list with each supplier's page (public since 2026-11-12), so a
 * supplier can be found by its name. A failed read keeps the fixed pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const fixed = ['', '/join', '/supplier/join', '/suppliers-join', '/terms', '/app/suppliers'].map((path) => ({ url: `${base}${path}` }))
  try {
    const suppliers = await loadPublicSuppliers(await loadProducts({ showPrices: false }))
    return [...fixed, ...suppliers.map((supplier) => ({ url: `${base}/app/suppliers/${supplier.id}` }))]
  } catch {
    return fixed
  }
}
