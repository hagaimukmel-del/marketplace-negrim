import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { unitLabel } from '@/lib/catalog'

interface Row {
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  products: {
    name_he: string
    brand: string | null
    mpn: string | null
    base_unit: string
    categories: { name_he: string } | null
  } | null
}

/** The same columns, in the same order, as the import template in PriceImport. */
const HEADERS = ['שם המוצר', 'מחיר ללא מע״מ', 'מק״ט', 'מלאי', 'יחידה', 'אריזה', 'כמות באריזה', 'מותג', 'מק״ט יצרן', 'קטגוריה']

function cell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * "הורד את המחירון שלי": the supplier's live products as a CSV that opens in
 * Excel, gets corrected there, and goes back in through "ייבוא מאקסל".
 *
 * The headers are the import's own, so the columns map themselves on the way
 * back, and a row finds its product again by מק״ט or else by exact name. Hidden
 * products are left out: re-importing a row turns its product back on, and a
 * download should not do that by surprise.
 */
export async function GET() {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('supplier_offers')
    .select('supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, products(name_he, brand, mpn, base_unit, categories(name_he))')
    .eq('supplier_id', supplier.id)
    .eq('is_active', true)
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data ?? []) as unknown as Row[])
    .filter((row) => row.products)
    .sort((a, b) => a.products!.name_he.localeCompare(b.products!.name_he, 'he'))
    .map((row) => {
      const product = row.products!
      return [
        product.name_he,
        Number(row.price_excl_vat),
        row.supplier_sku,
        row.stock_qty,
        unitLabel(product.base_unit),
        row.pack_label,
        row.pack_qty == null ? null : Number(row.pack_qty),
        product.brand,
        product.mpn,
        product.categories?.name_he ?? null,
      ]
        .map(cell)
        .join(',')
    })

  // The BOM is what makes Excel read Hebrew as Hebrew.
  const csv = '﻿' + [HEADERS.join(','), ...rows].join('\r\n') + '\r\n'
  const date = new Date().toISOString().slice(0, 10)
  const name = `מחירון ${supplier.company_name} ${date}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pricelist-${date}.csv"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  })
}
