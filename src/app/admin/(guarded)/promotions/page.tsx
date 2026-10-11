import { loadPromoWeeks } from '@/lib/promo'
import { addDays, bookableWeeks, currentWeek } from '@/lib/promo-weeks'
import PromotionsClient from './PromotionsClient'

export const dynamic = 'force-dynamic'

/**
 * "מוצר השבוע" for the operator (T-024): bookings waiting for approval, the
 * coming weeks, and what each week that ran did.
 */
export default async function AdminPromotions() {
  const { ready, weeks } = await loadPromoWeeks({
    from: addDays(currentWeek(), -26 * 7),
    to: bookableWeeks().at(-1)!,
    statuses: ['requested', 'approved', 'rejected'],
  })
  return <PromotionsClient ready={ready} weeks={weeks} />
}
