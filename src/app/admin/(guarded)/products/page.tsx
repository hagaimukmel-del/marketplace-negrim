import { getSupabaseAdmin } from '@/lib/supabase-admin'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

const SELECT =
  'id, name_he, name_en, description_he, is_active, image_url, category_id, brand, mpn, ' +
  'base_unit, categories(name_he), ' +
  'supplier_offers(id, supplier_id, supplier_sku, price_excl_vat, stock_qty, pack_label, ' +
  'pack_qty, min_order_qty, lead_time_days, is_active, source, suppliers(company_name))'

interface RawOffer {
  id: string
  supplier_id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  min_order_qty: number
  lead_time_days: number | null
  is_active: boolean
  source: string
  suppliers: { company_name: string } | null
}

interface RawProduct {
  id: string
  name_he: string
  name_en: string | null
  description_he: string | null
  is_active: boolean
  image_url: string | null
  category_id: string | null
  brand: string | null
  mpn: string | null
  base_unit: string
  categories: { name_he: string } | null
  supplier_offers: RawOffer[]
}

export default async function AdminProductsPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: products }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from('products').select(SELECT).limit(500),
    supabase.from('categories').select('id, name_he').order('name_he'),
    // Only approved suppliers can be loaded against, so only they are offered.
    supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('status', 'approved')
      .order('company_name'),
  ])

  // One line per offer, because a price belongs to a supplier and not to the
  // product. A product nobody sells still appears, so it can be given an offer
  // rather than quietly vanishing from the console.
  const pairs: { product: RawProduct; offer: RawOffer | null }[] = []
  for (const product of (products ?? []) as unknown as RawProduct[]) {
    const offers = product.supplier_offers ?? []
    if (offers.length === 0) pairs.push({ product, offer: null })
    else for (const offer of offers) pairs.push({ product, offer })
  }

  const rows = pairs
    .map(({ product, offer }) => ({
      id: product.id,
      offer_id: offer?.id ?? null,
      name_he: product.name_he,
      name_en: product.name_en,
      description_he: product.description_he,
      brand: product.brand,
      mpn: product.mpn,
      base_unit: product.base_unit,
      category_id: product.category_id,
      categories: product.categories,
      image_url: product.image_url,
      is_active: product.is_active && (offer?.is_active ?? false),
      supplier_name: offer?.suppliers?.company_name ?? null,
      sku: offer?.supplier_sku ?? null,
      base_price_excl_vat: Number(offer?.price_excl_vat ?? 0),
      stock_qty: offer?.stock_qty ?? 0,
      pack_label: offer?.pack_label ?? null,
      pack_qty: offer?.pack_qty ?? null,
      min_order_qty: offer?.min_order_qty ?? 1,
      lead_time_days: offer?.lead_time_days ?? null,
      source: offer?.source ?? 'manual',
    }))
    .sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return b.base_price_excl_vat - a.base_price_excl_vat
    })

  return (
    <ProductsClient
      products={rows}
      categories={categories ?? []}
      suppliers={suppliers ?? []}
    />
  )
}
