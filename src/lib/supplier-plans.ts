/**
 * The supplier subscription (CLAUDE.md §5 Revenue model).
 *
 * Owner, 2026-11-03: one plan for every supplier, 350 ₪ a month excl. VAT on
 * an annual agreement of 12 months, 4,200 ₪ a year. It replaces the three
 * tiers by product count (1,300 / 1,900 / 2,400). Billing starts January 2027
 * (may slip) and happens outside the site: nothing here charges anyone. No
 * commission on orders. Change the numbers here only, so the join form, the
 * emails, the console and the terms say the same thing.
 */
export const SUPPLIER_MONTHLY_EXCL_VAT = 350
export const SUPPLIER_AGREEMENT_MONTHS = 12
export const SUPPLIER_ANNUAL_EXCL_VAT = SUPPLIER_MONTHLY_EXCL_VAT * SUPPLIER_AGREEMENT_MONTHS

/** "350 ₪ לחודש, הסכם שנתי ל-12 חודשים (4,200 ₪ לשנה), לפני מע״מ". */
export const SUPPLIER_PLAN_SUMMARY =
  `${SUPPLIER_MONTHLY_EXCL_VAT.toLocaleString('he-IL')} ₪ לחודש, הסכם שנתי ל-${SUPPLIER_AGREEMENT_MONTHS} חודשים ` +
  `(${SUPPLIER_ANNUAL_EXCL_VAT.toLocaleString('he-IL')} ₪ לשנה), לפני מע״מ`

export const BILLING_STARTS_LABEL = 'ינואר 2027'

/** One week of "מוצר השבוע", excl. VAT (T-024). Snapshotted on each booking. */
export const PROMO_WEEK_EXCL_VAT = 690
