/**
 * An order as the purchasing app reads it, and the rules drawn from it.
 * Pure and serialisable: built on the server, used by client components too.
 */

import { round2 } from '@/lib/vat'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface AppSupplier {
  id: string
  name: string
  phone: string | null
  terms: string[]
  leadDays: number | null
  minOrder: number | null
}

export interface AppOrderLine {
  productId: string | null
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  unit: string
  packLabel: string | null
  packQty: number | null
}

export interface AppOrder {
  id: string
  shortNumber: number
  orderNumber: string
  status: OrderStatus
  createdAt: string
  confirmedAt: string | null
  processingAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  submitted: number
  confirmed: number | null
  supplierNote: string | null
  carpenterSeenAt: string | null
  checkoutId: string | null
  address: string | null
  notes: string | null
  supplier: AppSupplier | null
  lines: AppOrderLine[]
}

/** What the order stands at: the supplier's confirmed amount once there is one. */
export function totalOf(order: AppOrder): number {
  return order.confirmed ?? order.submitted
}

export type Attention = 'changed' | 'waiting' | null

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whether an order wants the carpenter. One rule, used by the home screen, the
 * orders list and the order page, so they can never disagree:
 *   changed — the supplier confirmed an amount different from what was sent,
 *             and the carpenter has not said they saw it
 *   waiting — sent more than a day ago and still not confirmed
 */
export function attentionOf(order: AppOrder, now: number): Attention {
  const open = order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped'
  if (open && order.confirmed != null && round2(order.confirmed) !== round2(order.submitted) && !order.carpenterSeenAt) {
    return 'changed'
  }
  if (order.status === 'pending' && now - new Date(order.createdAt).getTime() > DAY_MS) return 'waiting'
  return null
}

export const STEP_LABELS = ['נשלחה לספק', 'אושרה', 'בהכנה', 'בדרך', 'התקבלה בנגרייה'] as const

/** "בהכנה" and "בדרך" are the supplier's to mark; not every supplier will. */
const OPTIONAL = new Set([2, 3])

const REACHED: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
}

export type StepState = 'done' | 'now' | 'skipped' | 'todo'

export interface Step {
  label: string
  optional: boolean
  state: StepState
  at: string | null
}

/**
 * The five steps, each done, current, skipped or still to come. An optional
 * step the order moved past without its time recorded is skipped — shown as
 * not marked, never as though it happened.
 */
export function orderSteps(order: AppOrder): Step[] {
  const reached = REACHED[order.status]
  const times = [order.createdAt, order.confirmedAt, order.processingAt, order.shippedAt, order.deliveredAt]
  return STEP_LABELS.map((label, i) => {
    const optional = OPTIONAL.has(i)
    let state: StepState = 'todo'
    if (reached === 4 || i < reached) state = optional && !times[i] ? 'skipped' : 'done'
    else if (i === reached) state = 'now'
    return { label, optional, state, at: state === 'done' || state === 'now' ? times[i] : null }
  })
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'ממתינה לאישור',
  confirmed: 'אושרה',
  processing: 'בהכנה',
  shipped: 'בדרך אליך',
  delivered: 'התקבלה',
  cancelled: 'בוטלה',
}

/** How much of this line, in the words on the shelf: "2 × שק 25 ק״ג" or "50 ק״ג". */
export function quantityText(line: { quantity: number; unit: string; packLabel: string | null; packQty: number | null }): string {
  if (line.packLabel && line.packQty && line.quantity % line.packQty === 0) {
    return `${line.quantity / line.packQty} × ${line.packLabel} ${line.packQty} ${line.unit}`
  }
  return `${line.quantity} ${line.unit}`
}
