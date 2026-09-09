import { getSupabaseAdmin } from '@/lib/supabase-admin'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

const SELECT =
  'id, sku, name_he, name_en, description_he, base_price_excl_vat, stock_qty, is_active, image_url, category_id, source, categories(name_he)'

export default async function AdminProductsPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(SELECT)
      .order('is_active', { ascending: false })
      .order('base_price_excl_vat', { ascending: false })
      .limit(500),
    supabase.from('categories').select('id, name_he').order('name_he'),
  ])

  return <ProductsClient products={products ?? []} categories={categories ?? []} />
}
