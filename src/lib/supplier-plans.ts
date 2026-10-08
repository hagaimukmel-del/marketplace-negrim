/**
 * The supplier subscription (owner, 2026-10-08; CLAUDE.md §5 Revenue model).
 *
 * A monthly fee by how many products the supplier lists, excl. VAT. Billing
 * starts January 2027 (may slip) and happens outside the site: nothing here
 * charges anyone. No commission on orders. Change the numbers here only, so
 * the emails and any later subscription screen say the same thing.
 */
export interface SupplierPlan {
  /** Inclusive upper bound on listed products; null for the open top tier. */
  maxProducts: number | null
  monthlyExclVat: number
}

export const SUPPLIER_PLANS: SupplierPlan[] = [
  { maxProducts: 50, monthlyExclVat: 1300 },
  { maxProducts: 150, monthlyExclVat: 1900 },
  { maxProducts: null, monthlyExclVat: 2500 },
]

export const BILLING_STARTS_LABEL = 'ינואר 2027'

/** "עד 50 מוצרים", "51 עד 150 מוצרים", "מעל 150 מוצרים". */
export function planLabel(index: number): string {
  const plan = SUPPLIER_PLANS[index]
  const floor = index === 0 ? 0 : SUPPLIER_PLANS[index - 1].maxProducts ?? 0
  if (plan.maxProducts == null) return `מעל ${floor} מוצרים`
  return floor === 0 ? `עד ${plan.maxProducts} מוצרים` : `${floor + 1} עד ${plan.maxProducts} מוצרים`
}

/** The plan a supplier with this many listed products falls in. */
export function planFor(productCount: number): SupplierPlan {
  return SUPPLIER_PLANS.find((plan) => plan.maxProducts == null || productCount <= plan.maxProducts) ?? SUPPLIER_PLANS[SUPPLIER_PLANS.length - 1]
}
