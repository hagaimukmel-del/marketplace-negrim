import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName } from '@/lib/email'
import {
  defaultPlan,
  monthOf,
  type BillingPayment,
  type BillingPlan,
  type BillingSupplier,
  type ChargeKind,
  type PaymentMethod,
  type PromoCharge,
} from '@/lib/billing-rules'

export interface BillingData {
  /** False before migration 20261109140000: the report still shows what is owed, but nothing can be recorded. */
  ready: boolean
  suppliers: BillingSupplier[]
  plans: Map<string, BillingPlan>
  promos: Map<string, PromoCharge[]>
  payments: Map<string, BillingPayment[]>
}

function group<T extends { supplierId: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) map.set(item.supplierId, [...(map.get(item.supplierId) ?? []), item])
  return map
}

/**
 * Everything the billing report needs, for every month at once: the report
 * also shows arrears and prepaid amounts, which depend on all months. The
 * volumes are small (a handful of suppliers, a row per week, a few payments a
 * month), so one read of each table is enough.
 */
export async function loadBillingData(): Promise<BillingData> {
  const supabase = getSupabaseAdmin()
  const [{ data: supplierRows }, { data: promoRows }, billingResult, paymentResult] = await Promise.all([
    supabase.from('suppliers').select('id, company_name, status, decided_at, created_at').order('company_name'),
    supabase.from('promo_weeks').select('supplier_id, week_start, price_excl_vat').eq('status', 'approved').limit(5000),
    supabase.from('supplier_billing').select('supplier_id, monthly_excl_vat, starts_month, ends_month, free_until_month, note'),
    supabase
      .from('supplier_payments')
      .select('id, supplier_id, kind, amount_excl_vat, paid_on, covers_from, covers_months, installment_no, installments_total, method, note')
      .limit(10000),
  ])

  const suppliers: BillingSupplier[] = (supplierRows ?? []).map((row) => ({
    id: row.id,
    name: row.company_name,
    status: row.status,
    since: row.decided_at ?? row.created_at,
    isTest: isTestName(row.company_name),
  }))

  const plans = new Map<string, BillingPlan>()
  for (const supplier of suppliers) plans.set(supplier.id, defaultPlan(supplier))
  for (const row of billingResult.data ?? []) {
    plans.set(row.supplier_id, {
      monthly: Number(row.monthly_excl_vat),
      startsMonth: monthOf(row.starts_month),
      endsMonth: row.ends_month ? monthOf(row.ends_month) : null,
      freeUntil: row.free_until_month ? monthOf(row.free_until_month) : null,
      note: row.note,
      custom: true,
    })
  }

  const promos = group<PromoCharge>(
    (promoRows ?? []).map((row) => ({ supplierId: row.supplier_id, weekStart: row.week_start, price: Number(row.price_excl_vat) })),
  )

  const payments = group<BillingPayment>(
    (paymentResult.data ?? []).map((row) => ({
      id: row.id,
      supplierId: row.supplier_id,
      kind: row.kind as ChargeKind,
      amount: Number(row.amount_excl_vat),
      paidOn: row.paid_on,
      coversFrom: monthOf(row.covers_from),
      coversMonths: row.covers_months,
      installmentNo: row.installment_no,
      installmentsTotal: row.installments_total,
      method: row.method as PaymentMethod | null,
      note: row.note,
    })),
  )

  return {
    ready: !billingResult.error && !paymentResult.error,
    suppliers,
    plans,
    promos,
    payments,
  }
}
