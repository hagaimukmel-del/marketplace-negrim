import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export type Carpenter = Tables['carpenters']['Row']
export type Campaign = Tables['campaigns']['Row']

/** A product as the offer page shows it, with the price already resolved. */
export interface OfferProduct {
  id: string
  name_he: string
  name_en: string | null
  description_he: string | null
  image_url: string | null
  /** List price, excluding VAT. */
  base_price_excl_vat: number
  /** What this carpenter pays today: the campaign price when one is set. */
  price_excl_vat: number
  stock_qty: number | null
  /** Quantity tiers, cheapest threshold first. */
  tiers: { min_qty: number; max_qty: number; unit_price_excl_vat: number }[]
}

export interface OfferPageData {
  carpenter: Carpenter
  campaign: Campaign | null
  featured: OfferProduct | null
  /** Products this carpenter has bought before, most recent first. */
  reorder: OfferProduct[]
  /** Shown instead of the reorder list when there is no history yet. */
  suggestions: OfferProduct[]
}

const PRODUCT_COLUMNS =
  'id, name_he, name_en, description_he, image_url, base_price_excl_vat, stock_qty, category_id'

type ProductPick = Pick<
  Tables['products']['Row'],
  | 'id'
  | 'name_he'
  | 'name_en'
  | 'description_he'
  | 'image_url'
  | 'base_price_excl_vat'
  | 'stock_qty'
  | 'category_id'
>

function toOfferProduct(
  product: ProductPick,
  tiers: Tables['volume_pricing']['Row'][],
  offerPrice?: number | null
): OfferProduct {
  const list = Number(product.base_price_excl_vat)
  return {
    id: product.id,
    name_he: product.name_he,
    name_en: product.name_en,
    description_he: product.description_he,
    image_url: product.image_url,
    base_price_excl_vat: list,
    price_excl_vat: offerPrice != null ? Number(offerPrice) : list,
    stock_qty: product.stock_qty,
    tiers: tiers
      .filter((tier) => tier.product_id === product.id)
      .sort((a, b) => a.min_qty - b.min_qty)
      .map((tier) => ({
        min_qty: tier.min_qty,
        max_qty: tier.max_qty,
        unit_price_excl_vat: Number(tier.unit_price_excl_vat),
      })),
  }
}

/**
 * Resolve the token in the URL to a carpenter.
 *
 * Every write coming from the offer page re-runs this rather than trusting a
 * carpenter id from the browser — the token is the only credential, so it is
 * the only thing worth believing.
 */
export async function resolveCarpenter(token: string): Promise<Carpenter | null> {
  if (!token || token.length < 12) return null

  const { data } = await getSupabaseAdmin()
    .from('carpenters')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle()

  return data ?? null
}

/** Record that the link was opened, and when this carpenter was first seen. */
export async function markSeen(carpenter: Carpenter): Promise<void> {
  const now = new Date().toISOString()
  await getSupabaseAdmin()
    .from('carpenters')
    .update({
      last_seen_at: now,
      first_seen_at: carpenter.first_seen_at ?? now,
    })
    .eq('id', carpenter.id)
}

export async function logEvent(
  eventType: Tables['offer_events']['Insert']['event_type'],
  fields: Omit<Tables['offer_events']['Insert'], 'event_type'>
): Promise<void> {
  // Never let a logging failure take the page down with it.
  try {
    await getSupabaseAdmin().from('offer_events').insert({ event_type: eventType, ...fields })
  } catch (error) {
    console.error('offer_events insert failed:', error)
  }
}

export async function getActiveCampaign(): Promise<Campaign | null> {
  const now = new Date().toISOString()
  const { data } = await getSupabaseAdmin()
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

export async function loadOfferPage(token: string): Promise<OfferPageData | null> {
  const carpenter = await resolveCarpenter(token)
  if (!carpenter) return null

  const supabase = getSupabaseAdmin()
  const campaign = await getActiveCampaign()

  // Everything this carpenter has ordered before, newest first. This is the
  // half of the page that grows the basket: both campaigns so far sold exactly
  // one line per order.
  const { data: history } = await supabase
    .from('order_items')
    .select('product_id, created_at, orders!inner(carpenter_id)')
    .eq('orders.carpenter_id', carpenter.id)
    .order('created_at', { ascending: false })
    .limit(60)

  const historyIds: string[] = []
  for (const row of history ?? []) {
    if (row.product_id && !historyIds.includes(row.product_id)) historyIds.push(row.product_id)
  }

  const wantedIds = [...new Set([campaign?.product_id, ...historyIds].filter(Boolean) as string[])]

  const { data: products } = wantedIds.length
    ? await supabase.from('products').select(PRODUCT_COLUMNS).in('id', wantedIds).eq('is_active', true)
    : { data: [] as ProductPick[] }

  const byId = new Map((products ?? []).map((p) => [p.id, p as ProductPick]))

  // A carpenter with no history still needs a reason to scroll: show other
  // products from the campaign product's own category.
  const featuredProduct = campaign ? byId.get(campaign.product_id) : undefined
  let suggestionRows: ProductPick[] = []

  if (historyIds.length === 0) {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('is_active', true)
      .neq('id', campaign?.product_id ?? '00000000-0000-0000-0000-000000000000')
      .order('base_price_excl_vat', { ascending: false })
      .limit(6)
    suggestionRows = (data ?? []) as ProductPick[]
  }

  const tierIds = [
    ...wantedIds,
    ...suggestionRows.map((p) => p.id),
  ]
  const { data: tiers } = tierIds.length
    ? await supabase.from('volume_pricing').select('*').in('product_id', tierIds)
    : { data: [] as Tables['volume_pricing']['Row'][] }

  const allTiers = tiers ?? []

  return {
    carpenter,
    campaign,
    featured: featuredProduct
      ? toOfferProduct(featuredProduct, allTiers, campaign?.offer_price_excl_vat)
      : null,
    reorder: historyIds
      .map((id) => byId.get(id))
      .filter((p): p is ProductPick => Boolean(p))
      .map((p) => toOfferProduct(p, allTiers)),
    suggestions: suggestionRows.map((p) => toOfferProduct(p, allTiers)),
  }
}
