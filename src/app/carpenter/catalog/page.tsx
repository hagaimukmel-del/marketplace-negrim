import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { canSeePrices } from '@/lib/carpenter-auth'
import {
  OFFER_COLUMNS,
  bestOffer,
  byPrice,
  inStock,
  offerCount,
  packLabel,
  priceOf,
  type CatalogProduct,
} from '@/lib/catalog'
import CatalogClient, { type CatalogItem } from './CatalogClient'

export const dynamic = 'force-dynamic'

/**
 * The catalogue, with prices for whoever has earned them.
 *
 * This used to run in the browser: the page fetched products and their offers
 * itself, with the public key. That made gating prices impossible to do
 * honestly — anything the browser is handed, the browser's owner can read, so
 * hiding a number in the markup hides nothing.
 *
 * So the read moved here. An anonymous visitor gets a payload with `price: null`
 * — not a price it was asked politely not to show, but no price at all. Stock
 * and the rest stay: seeing that something is available is exactly the reason
 * to register, and it is not commercially sensitive.
 *
 * Suppliers are the other half of why. No supplier joins a marketplace that
 * publishes their wholesale prices to their retail customers and their
 * competitors. The lock is a condition of recruiting them, not a UX flourish.
 */
export default async function CatalogPage() {
  const [showPrices, { data }, { data: allCategories }] = await Promise.all([
    canSeePrices(),
    getSupabaseAdmin()
      .from('products')
      .select(
        'id, name_he, name_en, description_he, image_url, category_id, brand, mpn, base_unit, ' +
          `categories(name_he), supplier_offers!inner(${OFFER_COLUMNS})`
      )
      .eq('is_active', true)
      .eq('supplier_offers.is_active', true)
      .limit(1000),
    getSupabaseAdmin().from('categories').select('id, name_he, parent_category_id'),
  ])

  // Fetched flat and resolved here rather than embedded: a self-referencing
  // join for ten rows is more machinery than the problem deserves.
  const categoryById = new Map(
    (allCategories ?? []).map((c) => [c.id, c as { id: string; name_he: string; parent_category_id: string | null }])
  )

  /** The top-level group a category belongs to, or the category itself. */
  function groupOf(categoryId: string | null): string {
    const category = categoryId ? categoryById.get(categoryId) : undefined
    if (!category) return 'אחר'
    const parent = category.parent_category_id
      ? categoryById.get(category.parent_category_id)
      : undefined
    return parent?.name_he ?? category.name_he
  }

  const products = ((data ?? []) as unknown as (CatalogProduct & {
    categories: { name_he: string } | null
  })[])
    .slice()
    .sort(byPrice)

  const items: CatalogItem[] = products.map((product) => {
    const offer = bestOffer(product)
    return {
      id: product.id,
      name_he: product.name_he,
      name_en: product.name_en,
      description_he: product.description_he,
      image_url: product.image_url,
      base_unit: product.base_unit,
      brand: product.brand,
      mpn: product.mpn,
      // Kept for search: a carpenter holding the box types what is printed on it.
      skus: product.supplier_offers.map((o) => o.supplier_sku).filter(Boolean) as string[],
      inStock: inStock(product),
      supplierCount: offerCount(product),
      packLabel: packLabel(offer, product.base_unit),
      category: product.categories?.name_he ?? 'ללא קטגוריה',
      group: groupOf(product.category_id),
      price: showPrices ? priceOf(product) : null,
    }
  })

  return <CatalogClient items={items} showPrices={showPrices} />
}
