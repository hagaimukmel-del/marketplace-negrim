import { getSupabaseAdmin } from '@/lib/supabase-admin'
import CampaignsClient from './CampaignsClient'

export const dynamic = 'force-dynamic'

interface ProductWithOffers {
  id: string
  name_he: string
  supplier_offers: { price_excl_vat: number }[]
}

export default async function CampaignsPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: products }, { data: campaigns }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name_he, supplier_offers!inner(price_excl_vat)')
      .eq('is_active', true)
      .eq('supplier_offers.is_active', true),
    supabase
      .from('campaigns')
      .select('id, name, kind, headline_he, is_active, created_at, products(name_he)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // The picker shows one price per product: the cheapest live offer. Sorted
  // here because PostgREST cannot order on an embedded column.
  const priced = ((products ?? []) as unknown as ProductWithOffers[])
    .map((product) => ({
      id: product.id,
      name_he: product.name_he,
      base_price_excl_vat: Math.min(
        ...product.supplier_offers.map((offer) => Number(offer.price_excl_vat))
      ),
    }))
    .sort((a, b) => b.base_price_excl_vat - a.base_price_excl_vat)

  return <CampaignsClient products={priced} campaigns={campaigns ?? []} />
}
