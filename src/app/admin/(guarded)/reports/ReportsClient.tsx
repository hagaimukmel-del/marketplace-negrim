'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react'
import { formatIls } from '@/lib/vat'

export type Period = '30' | '90' | '365' | 'all'

export interface ProductReport {
  id: string
  name: string
  category: string
  suppliers: number
  minPrice: number | null
  avgPrice: number | null
  maxPrice: number | null
  stock: number
  qty: number
  orders: number
  revenue: number
}

export interface SupplierReport {
  id: string
  name: string
  status: string
  offers: number
  comparable: number
  priceIndex: number | null
  orders: number
  revenue: number
}

export interface CategoryReport {
  id: string
  name: string
  products: number
  suppliers: number
  avgPrice: number | null
  qty: number
  orders: number
  revenue: number
}

type Tab = 'products' | 'suppliers' | 'categories'

interface Column<T> {
  key: string
  label: string
  value: (row: T) => string | number | null
  render?: (row: T) => React.ReactNode
  numeric?: boolean
}

const money = (value: number | null) => (value == null ? '—' : formatIls(value))
const count = (value: number) => value.toLocaleString('he-IL')

const PERIOD_LABEL: Record<Period, string> = { '30': '30 יום', '90': '90 יום', '365': 'שנה', all: 'מההתחלה' }

/** A CSV Excel opens in Hebrew: BOM, quoted cells. */
function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return (
    '﻿' +
    [columns.map((column) => quote(column.label)).join(','), ...rows.map((row) => columns.map((column) => quote(column.value(row))).join(','))].join('\n')
  )
}

function Table<T extends { id: string }>({
  rows,
  columns,
  defaultSort,
  fileName,
}: {
  rows: T[]
  columns: Column<T>[]
  defaultSort: string
  fileName: string
}) {
  const [sortKey, setSortKey] = useState(defaultSort)
  const [descending, setDescending] = useState(true)
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey) ?? columns[0]
    const q = query.trim().toLowerCase()
    const filtered = q ? rows.filter((row) => String(columns[0].value(row)).toLowerCase().includes(q)) : rows
    return filtered.slice().sort((a, b) => {
      const left = column.value(a)
      const right = column.value(b)
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'he')
      return descending ? -result : result
    })
  }, [rows, columns, sortKey, descending, query])

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(sorted, columns))}`

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-400" style={{ insetInlineStart: '0.7rem' }} />
          <input
            id={`report-search-${fileName}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש"
            aria-label="חיפוש בדוח"
            className="h-10 w-full rounded-lg border border-stone-300 bg-white ps-9 pe-3 text-sm"
          />
        </div>
        <a href={csvHref} download={`${fileName}.csv`} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700">
          <Download size={15} />
          ייצוא לאקסל
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`p-0 font-medium text-stone-500 ${column.numeric ? 'text-end' : 'text-start'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === column.key) setDescending(!descending)
                      else {
                        setSortKey(column.key)
                        setDescending(Boolean(column.numeric))
                      }
                    }}
                    className={`flex w-full items-center gap-1 px-3 py-2.5 text-xs ${column.numeric ? 'justify-end' : ''} ${sortKey === column.key ? 'text-stone-900' : ''}`}
                  >
                    {column.label}
                    {sortKey === column.key && (descending ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-stone-500">
                  אין נתונים
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id} className="border-b border-stone-100 last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-3 py-2.5 ${column.numeric ? 'tnum text-end' : ''}`}>
                      {column.render ? column.render(row) : column.value(row) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Reports for the operator. Figures at the top say how big things are; the
 * tabs hold the detail, sortable by any column and exportable to Excel.
 */
export default function ReportsClient({
  period,
  products,
  suppliers,
  categories,
  totals,
}: {
  period: Period
  products: ProductReport[]
  suppliers: SupplierReport[]
  categories: CategoryReport[]
  totals: { products: number; offers: number; suppliers: number; orders: number; revenue: number }
  supplierNames: Record<string, string>
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('products')

  const productColumns: Column<ProductReport>[] = [
    { key: 'name', label: 'מוצר', value: (row) => row.name, render: (row) => <span className="font-medium text-stone-900">{row.name}</span> },
    { key: 'category', label: 'קטגוריה', value: (row) => row.category, render: (row) => <span className="text-xs text-stone-500">{row.category}</span> },
    { key: 'suppliers', label: 'ספקים', value: (row) => row.suppliers, numeric: true },
    { key: 'min', label: 'מחיר מינימום', value: (row) => row.minPrice, render: (row) => money(row.minPrice), numeric: true },
    { key: 'avg', label: 'מחיר ממוצע', value: (row) => row.avgPrice, render: (row) => <strong>{money(row.avgPrice)}</strong>, numeric: true },
    { key: 'max', label: 'מחיר מקסימום', value: (row) => row.maxPrice, render: (row) => money(row.maxPrice), numeric: true },
    { key: 'stock', label: 'מלאי', value: (row) => row.stock, render: (row) => count(row.stock), numeric: true },
    { key: 'qty', label: 'כמות שהוזמנה', value: (row) => row.qty, render: (row) => count(row.qty), numeric: true },
    { key: 'revenue', label: 'מחזור', value: (row) => row.revenue, render: (row) => money(row.revenue), numeric: true },
  ]

  const supplierColumns: Column<SupplierReport>[] = [
    { key: 'name', label: 'ספק', value: (row) => row.name, render: (row) => <span className="font-medium text-stone-900">{row.name}</span> },
    { key: 'offers', label: 'מוצרים פעילים', value: (row) => row.offers, numeric: true },
    {
      key: 'index',
      label: 'מדד מחיר',
      value: (row) => row.priceIndex,
      numeric: true,
      render: (row) =>
        row.priceIndex == null ? (
          <span className="text-xs text-stone-400" title="אין מוצרים שגם ספק אחר מוכר">אין השוואה</span>
        ) : (
          <span className={`font-semibold ${row.priceIndex < 98 ? 'text-emerald-700' : row.priceIndex > 102 ? 'text-red-700' : 'text-stone-700'}`}>
            {Math.round(row.priceIndex)}
            <span className="text-xs font-normal text-stone-400"> ({row.comparable})</span>
          </span>
        ),
    },
    { key: 'orders', label: 'הזמנות', value: (row) => row.orders, numeric: true },
    { key: 'revenue', label: 'מחזור', value: (row) => row.revenue, render: (row) => money(row.revenue), numeric: true },
  ]

  const categoryColumns: Column<CategoryReport>[] = [
    { key: 'name', label: 'קטגוריה ראשית', value: (row) => row.name, render: (row) => <span className="font-medium text-stone-900">{row.name}</span> },
    { key: 'products', label: 'מוצרים', value: (row) => row.products, numeric: true },
    { key: 'suppliers', label: 'ספקים', value: (row) => row.suppliers, numeric: true },
    { key: 'avg', label: 'מחיר ממוצע למוצר', value: (row) => row.avgPrice, render: (row) => money(row.avgPrice), numeric: true },
    { key: 'qty', label: 'כמות שהוזמנה', value: (row) => row.qty, render: (row) => count(row.qty), numeric: true },
    { key: 'orders', label: 'הזמנות', value: (row) => row.orders, numeric: true },
    { key: 'revenue', label: 'מחזור', value: (row) => row.revenue, render: (row) => money(row.revenue), numeric: true },
  ]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'products', label: 'לפי מוצר' },
    { key: 'suppliers', label: 'לפי ספק' },
    { key: 'categories', label: 'לפי קטגוריה' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">דוחות</h1>
          <p className="mt-1 text-sm text-stone-600">מחירים — מהקטלוג היום. הזמנות ומחזור — מהתקופה שנבחרה, בלי הזמנות שבוטלו. סכומים ללא מע״מ.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          תקופה
          <select
            id="report-period"
            value={period}
            onChange={(e) => router.push(`/admin/reports?period=${e.target.value}`)}
            className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm"
          >
            {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
              <option key={key} value={key}>
                {PERIOD_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-5">
        {[
          { label: 'מוצרים עם מחיר', value: count(totals.products) },
          { label: 'מחירים פעילים', value: count(totals.offers) },
          { label: 'ספקים מאושרים', value: count(totals.suppliers) },
          { label: `הזמנות · ${PERIOD_LABEL[period]}`, value: count(totals.orders) },
          { label: `מחזור · ${PERIOD_LABEL[period]}`, value: formatIls(totals.revenue) },
        ].map((item) => (
          <div key={item.label} className="bg-white p-3">
            <p className="tnum text-xl font-bold text-stone-900">{item.value}</p>
            <p className="text-xs text-stone-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`h-10 rounded-full border px-4 text-sm font-semibold ${
              tab === item.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'products' && <Table rows={products} columns={productColumns} defaultSort="revenue" fileName="report-products" />}
      {tab === 'suppliers' && (
        <>
          <Table rows={suppliers} columns={supplierColumns} defaultSort="revenue" fileName="report-suppliers" />
          <p className="text-xs text-stone-500">
            מדד מחיר: 100 = ממוצע השוק למוצרים שגם ספקים אחרים מוכרים. מתחת ל-100 — זול מהממוצע. בסוגריים — על כמה מוצרים זה מחושב.
          </p>
        </>
      )}
      {tab === 'categories' && <Table rows={categories} columns={categoryColumns} defaultSort="revenue" fileName="report-categories" />}
    </div>
  )
}
