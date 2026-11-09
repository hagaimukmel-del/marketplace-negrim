import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadCurrentPromo, loadPromoWeeks } from '@/lib/promo'
import { loadPromoRecipients, promoCarpentersSent } from '@/lib/promo-carpenters'
import { addDays, bookableWeeks, currentWeek } from '@/lib/promo-weeks'
import { adminPromoWeeks } from '@/lib/promo-admin-rules'
import { PROMO_WEEK_EXCL_VAT } from '@/lib/supplier-plans'
import PromotionsClient, { type CarpenterMailing, type PromoSupplierOption } from './PromotionsClient'

export const dynamic = 'force-dynamic'

/**
 * Suppliers with the products each one sells live, for setting a week by hand.
 * Supplier names stay on the server (the browser cannot read `suppliers`).
 */
async function loadPromoOptions(): Promise<PromoSupplierOption[]> {
  const supabase = getSupabaseAdmin()
  const [{ data: suppliers }, { data: offers }] = await Promise.all([
    supabase.from('suppliers').select('id, company_name').eq('status', 'approved').order('company_name'),
    supabase.from('supplier_offers').select('supplier_id, product_id, products(name_he)').eq('is_active', true).limit(10000),
  ])
  const bySupplier = new Map<string, Map<string, string>>()
  for (const offer of (offers ?? []) as unknown as {
    supplier_id: string
    product_id: string
    products: { name_he: string } | null
  }[]) {
    if (!offer.products) continue
    const products = bySupplier.get(offer.supplier_id) ?? new Map<string, string>()
    products.set(offer.product_id, offer.products.name_he)
    bySupplier.set(offer.supplier_id, products)
  }
  return (suppliers ?? [])
    .filter((supplier) => bySupplier.has(supplier.id))
    .map((supplier) => ({
      id: supplier.id,
      name: supplier.company_name,
      products: [...bySupplier.get(supplier.id)!]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he')),
    }))
}

/**
 * "מוצר השבוע" for the operator (T-024): bookings waiting for approval, the
 * coming weeks, what each week that ran did, and setting a week by hand at a
 * supplier's request.
 */
/** This week's mail to the carpentries: how many get it, and whether it went. */
async function loadMailing(): Promise<CarpenterMailing> {
  const [promo, recipients] = await Promise.all([loadCurrentPromo(), loadPromoRecipients()])
  return {
    promoId: promo?.id ?? null,
    recipients: recipients.length,
    sent: promo ? await promoCarpentersSent(promo.id) : false,
  }
}

export default async function AdminPromotions() {
  const [{ ready, weeks }, suppliers, mailing] = await Promise.all([
    loadPromoWeeks({
      from: addDays(currentWeek(), -26 * 7),
      to: bookableWeeks().at(-1)!,
      statuses: ['requested', 'approved', 'rejected'],
    }),
    loadPromoOptions(),
    loadMailing(),
  ])
  return (
    <PromotionsClient
      ready={ready}
      weeks={weeks}
      suppliers={suppliers}
      selectableWeeks={adminPromoWeeks()}
      defaultPrice={PROMO_WEEK_EXCL_VAT}
      mailing={mailing}
    />
  )
}
