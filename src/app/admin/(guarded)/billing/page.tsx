import { loadBillingData } from '@/lib/billing'
import {
  billingTotals,
  currentMonth,
  isMonth,
  isRelevant,
  reportMonths,
  supplierBilling,
  BILLING_START_MONTH,
} from '@/lib/billing-rules'
import { SUPPLIER_MONTHLY_EXCL_VAT, PROMO_WEEK_EXCL_VAT } from '@/lib/supplier-plans'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

/**
 * What each supplier owes the platform in a month and what they paid
 * (owner, 2026-11-09): the subscription and "מוצר השבוע", side by side, with
 * the running balance and what was paid ahead. Payments are recorded here by
 * hand; billing itself happens outside the site (CLAUDE.md §5).
 */
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: requested } = await searchParams
  const months = reportMonths()
  const month = isMonth(requested) ? requested : currentMonth()

  const data = await loadBillingData()
  const rows = data.suppliers
    .map((supplier) =>
      supplierBilling(
        month,
        supplier,
        data.plans.get(supplier.id)!,
        data.promos.get(supplier.id) ?? [],
        data.payments.get(supplier.id) ?? [],
      ),
    )
    .filter(isRelevant)
    // Real suppliers first, then by what is still owed.
    .sort((a, b) => Number(a.supplier.isTest) - Number(b.supplier.isTest) || b.arrears - a.arrears || a.supplier.name.localeCompare(b.supplier.name, 'he'))

  return (
    <BillingClient
      ready={data.ready}
      month={month}
      months={months.includes(month) ? months : [...months, month].sort()}
      rows={rows}
      totals={billingTotals(rows)}
      defaults={{ monthly: SUPPLIER_MONTHLY_EXCL_VAT, promoWeek: PROMO_WEEK_EXCL_VAT, billingStart: BILLING_START_MONTH }}
    />
  )
}
