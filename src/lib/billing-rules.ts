/**
 * What each supplier owes the platform in a month, and what they paid
 * (admin report /admin/billing, owner 2026-11-09).
 *
 * Two charges (CLAUDE.md §5): the supplier subscription and "מוצר השבוע"
 * weeks. Billing happens outside the site; the operator records payments by
 * hand (migration 20261109140000). Pure rules, safe for server and browser,
 * so they are tested without a database.
 *
 * Months are 'YYYY-MM' strings throughout. Amounts are excl. VAT.
 */

import { round2 } from '@/lib/vat'
import { SUPPLIER_MONTHLY_EXCL_VAT } from '@/lib/supplier-plans'

export type ChargeKind = 'subscription' | 'promo'

export const CHARGE_KIND_LABEL: Record<ChargeKind, string> = {
  subscription: 'מנוי',
  promo: 'פרסום',
}

export type PaymentMethod = 'transfer' | 'card' | 'check' | 'cash' | 'other'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'העברה בנקאית',
  card: 'אשראי',
  check: "צ'ק",
  cash: 'מזומן',
  other: 'אחר',
}

/**
 * The first month a subscription is owed by default: billing starts in
 * January 2027 (lib/supplier-plans.ts BILLING_STARTS_LABEL). A supplier row in
 * supplier_billing overrides it.
 */
export const BILLING_START_MONTH = '2027-01'

/** The first month the month picker offers: "מוצר השבוע" opened in October 2026. */
export const REPORT_FIRST_MONTH = '2026-10'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

// ---------- months ----------

export function isMonth(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false
  const m = Number(value.slice(5, 7))
  return m >= 1 && m <= 12
}

function index(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1
}

function fromIndex(i: number): string {
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
}

export function addMonths(month: string, n: number): string {
  return fromIndex(index(month) + n)
}

/** Months from a to b inclusive; negative when b is before a. */
export function monthsBetween(a: string, b: string): number {
  return index(b) - index(a) + 1
}

/** 'YYYY-MM' of a 'YYYY-MM-DD' date or an ISO timestamp (UTC date part). */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** The month running now in Israel. */
export function currentMonth(now: Date = new Date()): string {
  return monthOf(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }))
}

/** "נובמבר 2026". */
export function monthLabel(month: string): string {
  return `${HEBREW_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`
}

/** The months the picker offers: from REPORT_FIRST_MONTH to a year ahead, never fewer than a year past billing start. */
export function reportMonths(now: Date = new Date()): string[] {
  const last = [addMonths(currentMonth(now), 12), addMonths(BILLING_START_MONTH, 11)].sort().at(-1)!
  return Array.from({ length: monthsBetween(REPORT_FIRST_MONTH, last) }, (_, i) => addMonths(REPORT_FIRST_MONTH, i))
}

/** The first day of a month, as stored in the database. */
export function monthToDate(month: string): string {
  return `${month}-01`
}

function maxMonth(a: string, b: string): string {
  return a > b ? a : b
}

function minMonth(a: string, b: string): string {
  return a < b ? a : b
}

// ---------- inputs ----------

export interface BillingSupplier {
  id: string
  name: string
  status: string
  /** When the supplier was approved (suppliers.decided_at), or created when unknown. */
  since: string | null
  /** A test business ("ניסיון"): shown, never counted in the totals. */
  isTest: boolean
}

export interface BillingPlan {
  monthly: number
  startsMonth: string
  /** Last month owed, inclusive; null runs on. */
  endsMonth: string | null
  /** A free period: nothing owed up to and including this month. */
  freeUntil: string | null
  note: string | null
  /** Set by the operator (a supplier_billing row), rather than the default. */
  custom: boolean
}

export interface BillingPayment {
  id: string
  supplierId: string
  kind: ChargeKind
  amount: number
  /** 'YYYY-MM-DD': when the money arrived. */
  paidOn: string
  coversFrom: string
  coversMonths: number
  installmentNo: number | null
  installmentsTotal: number | null
  method: PaymentMethod | null
  note: string | null
}

export interface PromoCharge {
  supplierId: string
  /** 'YYYY-MM-DD', a Sunday. The week is charged to the month it starts in. */
  weekStart: string
  price: number
}

/**
 * The subscription a supplier has without a supplier_billing row: an approved,
 * real supplier owes the list price from billing start or the month they were
 * approved, whichever is later. Anyone else (pending, rejected, blocked, a
 * test business) owes nothing until the operator sets a plan.
 */
export function defaultPlan(supplier: BillingSupplier): BillingPlan {
  const owes = supplier.status === 'approved' && !supplier.isTest
  const since = supplier.since ? monthOf(supplier.since) : BILLING_START_MONTH
  return {
    monthly: owes ? SUPPLIER_MONTHLY_EXCL_VAT : 0,
    startsMonth: maxMonth(BILLING_START_MONTH, isMonth(since) ? since : BILLING_START_MONTH),
    endsMonth: null,
    freeUntil: null,
    note: null,
    custom: false,
  }
}

// ---------- the report ----------

export interface ChargeLine {
  owed: number
  /** Payments allocated to this month. */
  paid: number
  /** owed - paid: positive is still owed, negative is credit. */
  balance: number
}

export interface SupplierBilling {
  supplier: BillingSupplier
  plan: BillingPlan
  subscription: ChargeLine
  promo: ChargeLine & { weeks: number }
  total: ChargeLine
  /** Money that arrived during the month (by paid_on), whatever it covers. */
  received: number
  /** Everything owed up to the end of the month, minus everything allocated to those months. */
  arrears: number
  /** Allocated to months after this one: paid ahead. */
  ahead: number
  payments: BillingPayment[]
}

export interface BillingTotals {
  subscription: ChargeLine
  promo: ChargeLine & { weeks: number }
  total: ChargeLine
  received: number
  arrears: number
  ahead: number
}

/**
 * A payment spread over the months it covers, in equal parts. Rounded to
 * agorot; the last month takes the remainder so the parts add up.
 */
export function allocate(payment: Pick<BillingPayment, 'amount' | 'coversFrom' | 'coversMonths'>): Map<string, number> {
  const months = Math.max(1, Math.floor(payment.coversMonths))
  const part = round2(payment.amount / months)
  const parts = new Map<string, number>()
  for (let i = 0; i < months; i++) {
    parts.set(addMonths(payment.coversFrom, i), i === months - 1 ? round2(payment.amount - part * (months - 1)) : part)
  }
  return parts
}

function line(owed: number, paid: number): ChargeLine {
  return { owed: round2(owed), paid: round2(paid), balance: round2(owed - paid) }
}

/** Months the plan charges for that fall in [from, to], both inclusive: after any free period. */
function planMonths(plan: BillingPlan, from: string | null, to: string): number {
  const paidFrom = plan.freeUntil ? maxMonth(plan.startsMonth, addMonths(plan.freeUntil, 1)) : plan.startsMonth
  const start = from ? maxMonth(paidFrom, from) : paidFrom
  const end = plan.endsMonth ? minMonth(plan.endsMonth, to) : to
  return Math.max(0, monthsBetween(start, end))
}

export function supplierBilling(
  month: string,
  supplier: BillingSupplier,
  plan: BillingPlan,
  promos: PromoCharge[],
  payments: BillingPayment[],
): SupplierBilling {
  const subOwed = plan.monthly * planMonths(plan, month, month)
  const subOwedToDate = plan.monthly * planMonths(plan, null, month)

  let promoOwed = 0
  let promoOwedToDate = 0
  let weeks = 0
  for (const promo of promos) {
    const m = monthOf(promo.weekStart)
    if (m === month) {
      promoOwed += promo.price
      weeks++
    }
    if (m <= month) promoOwedToDate += promo.price
  }

  const paid: Record<ChargeKind, number> = { subscription: 0, promo: 0 }
  let paidToDate = 0
  let ahead = 0
  let received = 0
  for (const payment of payments) {
    if (monthOf(payment.paidOn) === month) received += payment.amount
    for (const [m, amount] of allocate(payment)) {
      if (m === month) paid[payment.kind] += amount
      if (m <= month) paidToDate += amount
      else if (monthOf(payment.paidOn) <= month) ahead += amount
    }
  }

  const subscription = line(subOwed, paid.subscription)
  const promo = { ...line(promoOwed, paid.promo), weeks }
  return {
    supplier,
    plan,
    subscription,
    promo,
    total: line(subscription.owed + promo.owed, subscription.paid + promo.paid),
    received: round2(received),
    arrears: round2(subOwedToDate + promoOwedToDate - paidToDate),
    ahead: round2(ahead),
    payments: [...payments].sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0)),
  }
}

/** Whether a row belongs in the month's report: a live supplier, or any money either way. */
export function isRelevant(row: SupplierBilling): boolean {
  return (
    row.supplier.status === 'approved' ||
    row.total.owed !== 0 ||
    row.total.paid !== 0 ||
    row.received !== 0 ||
    row.arrears !== 0 ||
    row.ahead !== 0
  )
}

/** Totals over real suppliers only: test businesses are left out. */
export function billingTotals(rows: SupplierBilling[]): BillingTotals {
  const sum = (pick: (row: SupplierBilling) => number) =>
    round2(rows.filter((row) => !row.supplier.isTest).reduce((acc, row) => acc + pick(row), 0))
  return {
    subscription: { owed: sum((r) => r.subscription.owed), paid: sum((r) => r.subscription.paid), balance: sum((r) => r.subscription.balance) },
    promo: {
      owed: sum((r) => r.promo.owed),
      paid: sum((r) => r.promo.paid),
      balance: sum((r) => r.promo.balance),
      weeks: sum((r) => r.promo.weeks),
    },
    total: { owed: sum((r) => r.total.owed), paid: sum((r) => r.total.paid), balance: sum((r) => r.total.balance) },
    received: sum((r) => r.received),
    arrears: sum((r) => r.arrears),
    ahead: sum((r) => r.ahead),
  }
}

// ---------- parsing the operator's input ----------

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function money(value: unknown, allowZero: boolean): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 1_000_000) return null
  return round2(n)
}

function int(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isInteger(n) ? n : null
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export interface PaymentInput {
  supplierId: string
  kind: ChargeKind
  amount: number
  paidOn: string
  coversFrom: string
  coversMonths: number
  installmentNo: number | null
  installmentsTotal: number | null
  method: PaymentMethod | null
  note: string | null
}

/**
 * A payment the operator records. Body: `{ supplier_id, kind, amount_excl_vat,
 * paid_on, covers_from, covers_months?, installment_no?, installments_total?,
 * method?, note? }`.
 */
export function parsePayment(body: Record<string, unknown>): Parsed<PaymentInput> {
  const supplierId = text(body.supplier_id)
  if (!supplierId) return { ok: false, error: 'בחרו ספק' }
  const kind = body.kind
  if (kind !== 'subscription' && kind !== 'promo') return { ok: false, error: 'סוג תשלום לא תקין' }
  const amount = money(body.amount_excl_vat, false)
  if (amount === null) return { ok: false, error: 'סכום לא תקין' }
  const paidOn = text(body.paid_on)
  if (!isDate(paidOn)) return { ok: false, error: 'תאריך תשלום לא תקין' }
  const coversFrom = text(body.covers_from)
  if (!isMonth(coversFrom)) return { ok: false, error: 'חודש לא תקין' }
  const coversMonths = body.covers_months === undefined || body.covers_months === '' ? 1 : int(body.covers_months)
  if (coversMonths === null || coversMonths < 1 || coversMonths > 24) return { ok: false, error: 'מספר חודשים בין 1 ל-24' }

  const no = body.installment_no === undefined || body.installment_no === '' || body.installment_no === null ? null : int(body.installment_no)
  const total = body.installments_total === undefined || body.installments_total === '' || body.installments_total === null ? null : int(body.installments_total)
  if ((no === null) !== (total === null)) return { ok: false, error: 'תשלום מתוך כמה: צריך את שני המספרים' }
  if (no !== null && total !== null && (total < 2 || total > 36 || no < 1 || no > total)) {
    return { ok: false, error: 'מספר התשלום לא תקין' }
  }

  const method = body.method === undefined || body.method === '' || body.method === null ? null : body.method
  if (method !== null && !(typeof method === 'string' && method in PAYMENT_METHOD_LABEL)) {
    return { ok: false, error: 'אמצעי תשלום לא תקין' }
  }

  return {
    ok: true,
    value: {
      supplierId,
      kind,
      amount,
      paidOn,
      coversFrom,
      coversMonths,
      installmentNo: no,
      installmentsTotal: total,
      method: method as PaymentMethod | null,
      note: text(body.note).slice(0, 300) || null,
    },
  }
}

export interface PlanInput {
  supplierId: string
  /** Null removes the operator's plan, back to the default. */
  plan: { monthly: number; startsMonth: string; endsMonth: string | null; freeUntil: string | null; note: string | null } | null
}

/**
 * The operator sets a supplier's subscription. Body: `{ supplier_id,
 * monthly_excl_vat, starts_month, ends_month?, free_until_month?, note? }`, or `{ supplier_id,
 * reset: true }` to go back to the default.
 */
export function parsePlan(body: Record<string, unknown>): Parsed<PlanInput> {
  const supplierId = text(body.supplier_id)
  if (!supplierId) return { ok: false, error: 'בחרו ספק' }
  if (body.reset === true) return { ok: true, value: { supplierId, plan: null } }
  const monthly = money(body.monthly_excl_vat, true)
  if (monthly === null) return { ok: false, error: 'סכום חודשי לא תקין' }
  const startsMonth = text(body.starts_month)
  if (!isMonth(startsMonth)) return { ok: false, error: 'חודש התחלה לא תקין' }
  const ends = text(body.ends_month)
  if (ends && !isMonth(ends)) return { ok: false, error: 'חודש סיום לא תקין' }
  if (ends && ends < startsMonth) return { ok: false, error: 'חודש הסיום לפני חודש ההתחלה' }
  const free = text(body.free_until_month)
  if (free && !isMonth(free)) return { ok: false, error: 'חודש סוף החינם לא תקין' }
  return {
    ok: true,
    value: { supplierId, plan: { monthly, startsMonth, endsMonth: ends || null, freeUntil: free || null, note: text(body.note).slice(0, 300) || null } },
  }
}
