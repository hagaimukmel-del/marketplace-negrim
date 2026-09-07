import { getSupabaseAdmin } from '@/lib/supabase-admin'
import CampaignsClient from './CampaignsClient'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: products }, { data: campaigns }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name_he, base_price_excl_vat')
      .eq('is_active', true)
      .order('base_price_excl_vat', { ascending: false }),
    supabase
      .from('campaigns')
      .select('id, name, kind, headline_he, is_active, created_at, products(name_he)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return <CampaignsClient products={products ?? []} campaigns={campaigns ?? []} />
}
