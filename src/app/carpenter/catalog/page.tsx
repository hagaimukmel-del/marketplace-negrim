import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
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
import CatalogClient, { type CatalogItem, type TopCategory } from './CatalogClient'

export const dynamic = 'force-dynamic'

interface CategoryRow {
  id: string
  name_he: string
  parent_category_id: string | null
  sort_order: number
  icon: string | null
  is_active: boolean | null
}

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
 *
 * The category tree is resolved here too: every product is placed under its
 * main category and sub-category, and the client only draws the hub and the
 * branches.
 */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; s?: string }>
}) {
  const supabase = getSupabaseAdmin()
  const [{ c, s }, carpenter, admin, { data }, { data: allCategories }] = await Promise.all([
    searchParams,
    getSessionCarpenter(),
    isAdmin(),
    supabase
      .from('products')
      .select(
        'id, name_he, name_en, description_he, image_url, category_id, brand, mpn, base_unit, ' +
          `categories(name_he), supplier_offers!inner(${OFFER_COLUMNS})`
      )
      .eq('is_active', true)
      .eq('supplier_offers.is_active', true)
      .eq('supplier_offers.suppliers.status', 'approved')
      .limit(1000),
    supabase.from('categories').select('id, name_he, parent_category_id, sort_order, icon, is_active'),
  ])

  // A registered carpenter, or the operator looking at the site as one.
  const showPrices = Boolean(carpenter) || admin

  const categories = ((allCategories ?? []) as CategoryRow[]).filter((row) => row.is_active !== false)
  const byId = new Map(categories.map((row) => [row.id, row]))
  const bySort = (a: CategoryRow, b: CategoryRow) =>
    a.sort_order - b.sort_order || a.name_he.localeCompare(b.name_he, 'he')

  // Uncategorised products still need a home, and "other" is the honest one.
  const fallbackTop = categories.find((row) => !row.parent_category_id && row.icon === 'other') ?? null

  function placeOf(categoryId: string | null): { top: string | null; sub: string | null } {
    const category = categoryId ? byId.get(categoryId) : undefined
    if (!category) return { top: fallbackTop?.id ?? null, sub: null }
    if (category.parent_category_id && byId.has(category.parent_category_id)) {
      return { top: category.parent_category_id, sub: category.id }
    }
    return { top: category.id, sub: null }
  }

  const products = ((data ?? []) as unknown as (CatalogProduct & {
    categories: { name_he: string } | null
  })[])
    .slice()
    .sort(byPrice)

  const items: CatalogItem[] = products.map((product) => {
    const offer = bestOffer(product)
    const place = placeOf(product.category_id)
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
      category: product.categories?.name_he ?? null,
      topId: place.top,
      subId: place.sub,
      price: showPrices ? priceOf(product) : null,
    }
  })

  const tree: TopCategory[] = categories
    .filter((row) => !row.parent_category_id)
    .sort(bySort)
    .map((top) => ({
      id: top.id,
      name: top.name_he,
      icon: top.icon,
      count: items.filter((item) => item.topId === top.id).length,
      children: categories
        .filter((row) => row.parent_category_id === top.id)
        .sort(bySort)
        .map((child) => ({
          id: child.id,
          name: child.name_he,
          count: items.filter((item) => item.subId === child.id).length,
        })),
    }))

  const initialTop = tree.some((top) => top.id === c) ? c! : null
  const initialSub =
    initialTop && tree.find((top) => top.id === initialTop)!.children.some((child) => child.id === s)
      ? s!
      : null

  return (
    <CatalogClient
      items={items}
      tree={tree}
      showPrices={showPrices}
      adminView={admin && !carpenter}
      initialTop={initialTop}
      initialSub={initialSub}
    />
  )
}
