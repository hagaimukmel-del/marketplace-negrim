/**
 * The supplier's own sales, worked out from the orders the page already loaded.
 *
 * Only orders sent to this supplier, and only their own lines, so the numbers
 * never reach into another supplier's business. Amounts are excl. VAT. An order
 * counts as a sale once the supplier confirmed it, at the amount they
 * confirmed; pending orders are "waiting" and cancelled ones "rejected".
 */

import type { SupplierOrder } from './types'

const WON = new Set(['confirmed', 'processing', 'shipped', 'delivered'])

export interface MonthRow {
  /** YYYY-MM */
  key: string
  label: string
  orders: number
  amount: number
}

export interface ProductRow {
  name: string
  quantity: number
  amount: number
  orders: number
}

export interface CustomerRow {
  key: string
  name: string
  contactName: string | null
  phone: string | null
  orders: number
  amount: number
  lastOrderAt: string
  waiting: number
}

export interface Sales {
  months: MonthRow[]
  products: ProductRow[]
  customers: CustomerRow[]
  won: number
  rejected: number
  waiting: number
  wonAmount: number
  thisMonth: number
  lastMonth: number
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** What an accepted order is worth: the confirmed amount, else its supplied lines. */
export function orderAmount(order: SupplierOrder): number {
  if (order.confirmedTotal != null) return order.confirmedTotal
  return order.lines.filter((line) => !line.unavailable).reduce((sum, line) => sum + line.lineTotal, 0)
}

export function computeSales(orders: SupplierOrder[], now: Date, monthsBack = 12): Sales {
  const months: MonthRow[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: monthKey(date),
      label: date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
      orders: 0,
      amount: 0,
    })
  }
  const byMonth = new Map(months.map((month) => [month.key, month]))
  const products = new Map<string, ProductRow>()
  const customers = new Map<string, CustomerRow>()
  let won = 0
  let rejected = 0
  let waiting = 0
  let wonAmount = 0

  for (const order of orders) {
    const customer = customers.get(order.customerKey) ?? {
      key: order.customerKey,
      name: order.buyer,
      contactName: order.contactName,
      phone: order.phone,
      orders: 0,
      amount: 0,
      lastOrderAt: order.createdAt,
      waiting: 0,
    }
    if (order.createdAt > customer.lastOrderAt) {
      customer.lastOrderAt = order.createdAt
      customer.name = order.buyer
      customer.phone = order.phone ?? customer.phone
    }

    if (order.status === 'cancelled') {
      rejected += 1
    } else if (order.status === 'pending') {
      waiting += 1
      customer.waiting += 1
    } else if (WON.has(order.status)) {
      const amount = orderAmount(order)
      won += 1
      wonAmount += amount
      customer.orders += 1
      customer.amount += amount

      const month = byMonth.get(monthKey(new Date(order.createdAt)))
      if (month) {
        month.orders += 1
        month.amount += amount
      }

      for (const line of order.lines) {
        if (line.unavailable) continue
        const row = products.get(line.name) ?? { name: line.name, quantity: 0, amount: 0, orders: 0 }
        row.quantity += line.quantity
        row.amount += line.lineTotal
        row.orders += 1
        products.set(line.name, row)
      }
    }
    customers.set(order.customerKey, customer)
  }

  const round = (value: number) => Math.round(value * 100) / 100
  const rounded = months.map((month) => ({ ...month, amount: round(month.amount) }))
  // A new supplier has a year of empty months before the first sale; the chart
  // starts at the first one, and never shows fewer than three.
  const first = rounded.findIndex((month) => month.orders > 0)
  const shown = rounded.slice(Math.max(0, Math.min(first === -1 ? rounded.length : first, rounded.length - 3)))
  return {
    months: shown,
    products: [...products.values()]
      .map((row) => ({ ...row, amount: round(row.amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    customers: [...customers.values()]
      .map((row) => ({ ...row, amount: round(row.amount) }))
      .sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt)),
    won,
    rejected,
    waiting,
    wonAmount: round(wonAmount),
    thisMonth: rounded[rounded.length - 1]?.amount ?? 0,
    lastMonth: rounded[rounded.length - 2]?.amount ?? 0,
  }
}
