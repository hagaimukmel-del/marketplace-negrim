import { getSupabaseAdmin } from '@/lib/supabase-admin'
import CategoriesClient, { type AdminCategory } from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = getSupabaseAdmin()
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name_he, name_en, parent_category_id, sort_order, icon, is_active')
      .order('sort_order')
      .order('name_he'),
    supabase.from('products').select('category_id').limit(20000),
  ])

  const counts = new Map<string, number>()
  for (const product of products ?? []) {
    if (product.category_id) counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1)
  }

  const rows: AdminCategory[] = (categories ?? []).map((row) => ({
    ...row,
    is_active: row.is_active !== false,
    products: counts.get(row.id) ?? 0,
  }))

  return <CategoriesClient rows={rows} />
}
