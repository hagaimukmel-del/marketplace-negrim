/**
 * Reading a supplier's price list — the part shared by the browser (which reads
 * the file and maps the columns) and the server (which decides what each row
 * means). Nothing here touches the database.
 */

import { BASE_UNITS, type BaseUnit } from './catalog'

export const IMPORT_FIELDS = [
  { key: 'name', label: 'שם המוצר', required: true, aliases: ['שם', 'שם מוצר', 'שם המוצר', 'תיאור', 'תאור', 'מוצר', 'פריט', 'name', 'product', 'description'] },
  { key: 'price', label: 'מחיר ללא מע״מ', required: true, aliases: ['מחיר', 'מחיר ללא מעמ', 'מחיר לפני מעמ', 'מחיר נטו', 'price', 'cost'] },
  { key: 'sku', label: 'מק״ט', required: false, aliases: ['מקט', 'מק"ט', 'מק״ט', 'קוד', 'קוד פריט', 'sku', 'code', 'item code'] },
  { key: 'stock', label: 'מלאי', required: false, aliases: ['מלאי', 'כמות', 'כמות במלאי', 'stock', 'qty', 'quantity'] },
  { key: 'unit', label: 'יחידת מידה', required: false, aliases: ['יחידה', 'יחידת מידה', 'יח', 'unit', 'uom'] },
  { key: 'packLabel', label: 'אריזה', required: false, aliases: ['אריזה', 'סוג אריזה', 'pack', 'package'] },
  { key: 'packQty', label: 'כמות באריזה', required: false, aliases: ['כמות באריזה', 'יחידות באריזה', 'pack qty', 'pack size'] },
  { key: 'brand', label: 'מותג / יצרן', required: false, aliases: ['מותג', 'יצרן', 'brand', 'manufacturer'] },
  { key: 'mpn', label: 'מק״ט יצרן', required: false, aliases: ['מקט יצרן', 'מק"ט יצרן', 'מק״ט יצרן', 'mpn', 'part number'] },
  { key: 'category', label: 'קטגוריה', required: false, aliases: ['קטגוריה', 'קבוצה', 'משפחה', 'category', 'group'] },
] as const

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]['key']
export type ColumnMapping = Record<ImportFieldKey, number>

export interface ImportRow {
  /** 1-based row number in the file, so errors point at a real line. */
  row: number
  name: string
  price: number | null
  sku: string | null
  stock: number | null
  unit: BaseUnit | null
  packLabel: string | null
  packQty: number | null
  brand: string | null
  mpn: string | null
  category: string | null
}

export type CellValue = string | number | boolean | Date | null | undefined

function normaliseHeader(value: CellValue): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/["'׳״]/g, '')
    .replace(/[()₪:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Which row holds the headers, and which column is which field.
 * The first of the top ten rows that names at least two fields wins; a file with
 * no recognisable headers maps nothing, and the person picks the columns.
 */
export function detectColumns(rows: CellValue[][]): { headerRow: number; mapping: ColumnMapping } {
  const empty = Object.fromEntries(IMPORT_FIELDS.map((field) => [field.key, -1])) as ColumnMapping

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const headers = rows[r].map(normaliseHeader)
    const mapping = { ...empty }
    let found = 0
    for (const field of IMPORT_FIELDS) {
      const aliases = field.aliases.map((alias) => normaliseHeader(alias))
      // Exact matches first, so "מק״ט יצרן" is not taken for "מק״ט".
      let index = headers.findIndex((header) => aliases.includes(header))
      if (index === -1) index = headers.findIndex((header) => header && aliases.some((alias) => header.startsWith(alias)))
      if (index !== -1 && !Object.values(mapping).includes(index)) {
        mapping[field.key] = index
        found += 1
      }
    }
    if (found >= 2) return { headerRow: r, mapping }
  }
  return { headerRow: -1, mapping: empty }
}

function cellText(value: CellValue): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text : null
}

/** "₪1,250.00", "1250 ש״ח", 1250 → 1250. */
export function parseNumber(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = cellText(value)
  if (!text) return null
  const cleaned = text.replace(/[₪,\s]/g, '').replace(/ש["״]?ח/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

const UNIT_WORDS: Record<string, BaseUnit> = {
  'יח': 'unit', 'יחידה': 'unit', 'יחידות': 'unit', unit: 'unit', pcs: 'unit', pc: 'unit',
  'קג': 'kg', 'קילו': 'kg', kg: 'kg',
  'ליטר': 'liter', 'ל': 'liter', liter: 'liter', l: 'liter',
  'מטר': 'meter', 'מ': 'meter', meter: 'meter', m: 'meter',
  'מר': 'sqm', 'מטר רבוע': 'sqm', sqm: 'sqm', m2: 'sqm',
}

export function parseUnit(value: CellValue): BaseUnit | null {
  const text = cellText(value)
  if (!text) return null
  const key = text.toLowerCase().replace(/["'׳״.]/g, '').trim()
  if (key in BASE_UNITS) return key as BaseUnit
  return UNIT_WORDS[key] ?? null
}

/** Rows under the header, as import rows. Blank lines are dropped. */
export function toImportRows(rows: CellValue[][], headerRow: number, mapping: ColumnMapping): ImportRow[] {
  const at = (row: CellValue[], key: ImportFieldKey) => (mapping[key] >= 0 ? row[mapping[key]] : null)
  const result: ImportRow[] = []

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const name = cellText(at(row, 'name'))
    const price = parseNumber(at(row, 'price'))
    if (!name && price == null) continue

    const stock = parseNumber(at(row, 'stock'))
    result.push({
      row: r + 1,
      name: name ?? '',
      price,
      sku: cellText(at(row, 'sku')),
      stock: stock == null ? null : Math.max(0, Math.round(stock)),
      unit: parseUnit(at(row, 'unit')),
      packLabel: cellText(at(row, 'packLabel')),
      packQty: parseNumber(at(row, 'packQty')),
      brand: cellText(at(row, 'brand')),
      mpn: cellText(at(row, 'mpn')),
      category: cellText(at(row, 'category')),
    })
  }
  return result
}

/** A small CSV reader for files saved from Excel as CSV: quotes, commas, BOM. */
export function parseCsv(text: string): CellValue[][] {
  const rows: CellValue[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^﻿/, '')
  const delimiter = source.split('\n')[0].split(';').length > source.split('\n')[0].split(',').length ? ';' : ','

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

export type PlanAction = 'update' | 'unchanged' | 'attach' | 'create' | 'error'

export interface PlanLine {
  row: number
  name: string
  action: PlanAction
  price: number | null
  before: { price: number; stock: number } | null
  stock: number | null
  message: string | null
}

export const ACTION_LABEL: Record<PlanAction, string> = {
  update: 'עדכון מחיר',
  unchanged: 'ללא שינוי',
  attach: 'מוצר קיים באתר',
  create: 'מוצר חדש',
  error: 'שגיאה',
}

export const MAX_IMPORT_ROWS = 2000
