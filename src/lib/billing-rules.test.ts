import { describe, expect, it } from 'vitest'
import {
  allocate,
  billingTotals,
  defaultPlan,
  parsePayment,
  parsePlan,
  reportMonths,
  supplierBilling,
  type BillingPayment,
  type BillingPlan,
  type BillingSupplier,
} from './billing-rules'
import { SUPPLIER_MONTHLY_EXCL_VAT } from './supplier-plans'

const supplier: BillingSupplier = { id: 's1', name: 'ספק', status: 'approved', since: '2026-10-05T10:00:00Z', isTest: false }
const plan: BillingPlan = { monthly: 350, startsMonth: '2027-01', endsMonth: null, note: null, custom: false }

function payment(over: Partial<BillingPayment>): BillingPayment {
  return {
    id: 'p',
    supplierId: 's1',
    kind: 'subscription',
    amount: 350,
    paidOn: '2027-01-10',
    coversFrom: '2027-01',
    coversMonths: 1,
    installmentNo: null,
    installmentsTotal: null,
    method: null,
    note: null,
    ...over,
  }
}

describe('defaultPlan', () => {
  it('an approved supplier owes the list price from billing start', () => {
    expect(defaultPlan(supplier)).toMatchObject({ monthly: SUPPLIER_MONTHLY_EXCL_VAT, startsMonth: '2027-01', custom: false })
  })

  it('starts from approval when that is later', () => {
    expect(defaultPlan({ ...supplier, since: '2027-03-15T08:00:00Z' }).startsMonth).toBe('2027-03')
  })

  it('pending, blocked and test suppliers owe nothing by default', () => {
    expect(defaultPlan({ ...supplier, status: 'pending' }).monthly).toBe(0)
    expect(defaultPlan({ ...supplier, status: 'blocked' }).monthly).toBe(0)
    expect(defaultPlan({ ...supplier, isTest: true }).monthly).toBe(0)
  })
})

describe('allocate', () => {
  it('spreads a year paid ahead evenly over 12 months', () => {
    const parts = allocate({ amount: 4200, coversFrom: '2027-01', coversMonths: 12 })
    expect(parts.size).toBe(12)
    expect(parts.get('2027-01')).toBe(350)
    expect(parts.get('2027-12')).toBe(350)
  })

  it('puts the rounding remainder on the last month', () => {
    const parts = allocate({ amount: 100, coversFrom: '2027-11', coversMonths: 3 })
    expect([...parts.keys()]).toEqual(['2027-11', '2027-12', '2028-01'])
    expect([...parts.values()]).toEqual([33.33, 33.33, 33.34])
  })
})

describe('supplierBilling', () => {
  it('nothing owed before billing starts, promo weeks still are', () => {
    const row = supplierBilling('2026-11', supplier, plan, [{ supplierId: 's1', weekStart: '2026-11-08', price: 95 }], [])
    expect(row.subscription).toEqual({ owed: 0, paid: 0, balance: 0 })
    expect(row.promo).toEqual({ owed: 95, paid: 0, balance: 95, weeks: 1 })
    expect(row.arrears).toBe(95)
  })

  it('charges a week to the month it starts in', () => {
    const promos = [{ supplierId: 's1', weekStart: '2026-11-29', price: 95 }]
    expect(supplierBilling('2026-11', supplier, plan, promos, []).promo.owed).toBe(95)
    expect(supplierBilling('2026-12', supplier, plan, promos, []).promo.owed).toBe(0)
  })

  it('a year paid ahead clears each month and shows the rest as prepaid', () => {
    const paid = [payment({ amount: 4200, coversMonths: 12, paidOn: '2026-12-20' })]
    const dec = supplierBilling('2026-12', supplier, plan, [], paid)
    expect(dec.received).toBe(4200)
    expect(dec.ahead).toBe(4200)
    expect(dec.arrears).toBe(0)

    const mar = supplierBilling('2027-03', supplier, plan, [], paid)
    expect(mar.subscription).toEqual({ owed: 350, paid: 350, balance: 0 })
    expect(mar.arrears).toBe(0)
    expect(mar.ahead).toBe(350 * 9)
    expect(mar.received).toBe(0)
  })

  it('arrears add up the months not paid', () => {
    const paid = [payment({ coversFrom: '2027-01' })]
    const row = supplierBilling('2027-03', supplier, plan, [], paid)
    expect(row.subscription.balance).toBe(350)
    expect(row.arrears).toBe(700)
  })

  it('stops charging after the last month and honours an exemption', () => {
    expect(supplierBilling('2027-05', supplier, { ...plan, endsMonth: '2027-04' }, [], []).subscription.owed).toBe(0)
    expect(supplierBilling('2027-05', supplier, { ...plan, monthly: 0 }, [], []).subscription.owed).toBe(0)
  })

  it('a payment paid after the month is not counted as ahead for that month', () => {
    const paid = [payment({ amount: 700, coversMonths: 2, coversFrom: '2027-02', paidOn: '2027-02-01' })]
    expect(supplierBilling('2027-01', supplier, plan, [], paid).ahead).toBe(0)
  })
})

describe('billingTotals', () => {
  it('leaves test businesses out', () => {
    const real = supplierBilling('2027-01', supplier, plan, [], [])
    const test = supplierBilling('2027-01', { ...supplier, id: 's2', isTest: true }, plan, [], [])
    expect(billingTotals([real, test]).total.owed).toBe(350)
  })
})

describe('reportMonths', () => {
  it('runs from October 2026 to a year ahead', () => {
    const months = reportMonths(new Date('2026-11-09T10:00:00Z'))
    expect(months[0]).toBe('2026-10')
    expect(months.at(-1)).toBe('2027-12')
  })
})

describe('parsePayment', () => {
  const base = { supplier_id: 's1', kind: 'subscription', amount_excl_vat: '350', paid_on: '2027-01-10', covers_from: '2027-01' }

  it('accepts a simple payment with defaults', () => {
    expect(parsePayment(base)).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        kind: 'subscription',
        amount: 350,
        paidOn: '2027-01-10',
        coversFrom: '2027-01',
        coversMonths: 1,
        installmentNo: null,
        installmentsTotal: null,
        method: null,
        note: null,
      },
    })
  })

  it('accepts an installment', () => {
    const parsed = parsePayment({ ...base, installment_no: '3', installments_total: '12', method: 'card' })
    expect(parsed.ok && [parsed.value.installmentNo, parsed.value.installmentsTotal, parsed.value.method]).toEqual([3, 12, 'card'])
  })

  it('refuses bad input', () => {
    expect(parsePayment({ ...base, amount_excl_vat: '0' }).ok).toBe(false)
    expect(parsePayment({ ...base, kind: 'orders' }).ok).toBe(false)
    expect(parsePayment({ ...base, paid_on: '2027-02-30' }).ok).toBe(false)
    expect(parsePayment({ ...base, covers_from: '2027-13' }).ok).toBe(false)
    expect(parsePayment({ ...base, covers_months: '25' }).ok).toBe(false)
    expect(parsePayment({ ...base, installment_no: '13', installments_total: '12' }).ok).toBe(false)
    expect(parsePayment({ ...base, installment_no: '1' }).ok).toBe(false)
    expect(parsePayment({ ...base, method: 'bitcoin' }).ok).toBe(false)
  })
})

describe('parsePlan', () => {
  it('accepts an exemption and a reset', () => {
    expect(parsePlan({ supplier_id: 's1', monthly_excl_vat: '0', starts_month: '2027-01' })).toMatchObject({ ok: true, value: { plan: { monthly: 0 } } })
    expect(parsePlan({ supplier_id: 's1', reset: true })).toEqual({ ok: true, value: { supplierId: 's1', plan: null } })
  })

  it('refuses an end before the start', () => {
    expect(parsePlan({ supplier_id: 's1', monthly_excl_vat: '350', starts_month: '2027-05', ends_month: '2027-01' }).ok).toBe(false)
  })
})
