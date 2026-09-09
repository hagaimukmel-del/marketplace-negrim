import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'
import type { Database } from '@/lib/database.types'

type ProductInsert = Database['public']['Tables']['products']['Insert']

const SHEET_ID = '1pSde0xYLViLEy9Nxp-qSGrBuqcZPd4o5dDlJntoSS6c'
const SHEET_NAME = 'דבקים'
const ITAMIR_SUPPLIER_ID = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'

/**
 * Fixed column positions. Index-based because several headers are duplicated
 * across languages and cannot be matched by name.
 */
const COL = {
  nameEn: 0,
  category: 1,
  nameHe: 2,
  nameAr: 3,
  descriptionHe: 5,
  descriptionEn: 6,
  price: 11,
  imageUrl: 14,
} as const

/**
 * The SKU column is found by its heading instead, wherever it sits.
 *
 * The sheet has no SKU column yet. Adding one at a fixed index would mean
 * either appending it at the far right or editing this file every time the
 * sheet is rearranged, so the header row is searched for it and any of the
 * spellings below is accepted.
 */
const SKU_HEADINGS = ['מק״ט', 'מק"ט', 'מקט', 'sku', 'קוד', 'קטלוגי', 'catalog']

function findSkuColumn(header: string[]): number | null {
  const index = header.findIndex((cell) => {
    const value = cell.trim().toLowerCase()
    return value.length > 0 && SKU_HEADINGS.some((h) => value.includes(h.toLowerCase()))
  })
  return index >= 0 ? index : null
}

/**
 * Prices arrive as "820₪" or "1,250₪". parseFloat('1,250') is 1 — it stops at
 * the separator — which once wrote eight products worth 1,200-1,450 ILS into
 * the catalogue at 1.00 ILS. Strip everything that is not a digit or a point.
 */
function parsePrice(raw: string | undefined): number {
  if (!raw) return 0
  const value = Number.parseFloat(raw.replace(/[^\d.]/g, ''))
  return Number.isFinite(value) ? value : 0
}

/** Google Drive share links only render from the direct-view form. */
function normaliseImageUrl(raw: string | undefined): string | null {
  const url = raw?.trim()
  if (!url) return null
  if (!url.includes('drive.google.com')) return url
  const fileId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : url
}

function cell(row: string[], index: number | null): string {
  if (index == null) return ''
  return (row[index] ?? '').trim()
}

interface SheetProduct extends ProductInsert {
  _category: string
}

async function readSheet(): Promise<{ products: SheetProduct[]; hasSkuColumn: boolean }> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Sheet fetch failed: ${response.status} ${response.statusText}`)
  }

  // A real CSV parser, not a hand-rolled split. The old one mis-handled quoted
  // commas, shifting every later column by one and writing the category into
  // the product name for 32 of 62 rows.
  const rows: string[][] = parse(await response.text(), {
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })

  const skuColumn = rows.length > 0 ? findSkuColumn(rows[0]) : null

  const products = rows
    .slice(1)
    .map((row): SheetProduct | null => {
      const nameHe = cell(row, COL.nameHe)
      const nameEn = cell(row, COL.nameEn)
      const price = parsePrice(cell(row, COL.price))

      if (!nameHe && !nameEn) return null
      if (price <= 0) return null

      return {
        sku: cell(row, skuColumn) || null,
        name_he: nameHe || nameEn,
        name_en: nameEn || nameHe,
        name_ar: cell(row, COL.nameAr) || null,
        description_he: cell(row, COL.descriptionHe) || null,
        description_en: cell(row, COL.descriptionEn) || null,
        base_price_excl_vat: price,
        image_url: normaliseImageUrl(cell(row, COL.imageUrl)),
        stock_qty: 100,
        is_active: true,
        supplier_id: ITAMIR_SUPPLIER_ID,
        source: 'sheet',
        _category: cell(row, COL.category),
      }
    })
    .filter((product): product is SheetProduct => product !== null)

  return { products, hasSkuColumn: skuColumn != null }
}

/** Resolve category names to ids, creating any the sheet has introduced. */
async function resolveCategories(names: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin()
  const wanted = [...new Set(names.filter(Boolean))]
  if (wanted.length === 0) return new Map()

  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_he')
    .in('name_he', wanted)

  if (error) throw new Error(`Category lookup failed: ${error.message}`)

  const byName = new Map((existing ?? []).map((c) => [c.name_he, c.id]))
  const missing = wanted.filter((name) => !byName.has(name))

  if (missing.length > 0) {
    const { data: created, error: createError } = await supabase
      .from('categories')
      .insert(missing.map((name_he) => ({ name_he, is_active: true })))
      .select('id, name_he')

    if (createError) throw new Error(`Category insert failed: ${createError.message}`)
    for (const category of created ?? []) byName.set(category.name_he, category.id)
  }

  return byName
}

export async function GET() {
  // Rebuilding the catalogue writes to production and pulls a Google Sheet on
  // every call, so it is an operator action and needs the operator session.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { products: sheetProducts, hasSkuColumn } = await readSheet()

    if (sheetProducts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'לא נמצאו שורות תקינות בגיליון' },
        { status: 422 }
      )
    }

    const categories = await resolveCategories(sheetProducts.map((p) => p._category))

    const rows: ProductInsert[] = sheetProducts.map(({ _category, ...product }) => ({
      ...product,
      category_id: categories.get(_category) ?? null,
      updated_at: new Date().toISOString(),
    }))

    // Which SKUs already exist? Answered before writing, so the report can say
    // what was overwritten rather than only what was touched — a repeated SKU
    // replaces a product, and that has to be visible, not silent.
    const incomingSkus = rows.map((r) => r.sku).filter((s): s is string => Boolean(s))
    const { data: existingRows } = incomingSkus.length
      ? await supabase
          .from('products')
          .select('sku, name_he')
          .eq('supplier_id', ITAMIR_SUPPLIER_ID)
          .in('sku', incomingSkus)
      : { data: [] }

    const overwritten = (existingRows ?? [])
      .filter((r) => r.sku)
      .map((r) => ({ sku: r.sku as string, name_he: r.name_he }))

    // Two passes, because the key differs. Rows carrying a SKU are matched on
    // it; rows without one fall back to the name pair so a sheet that has not
    // been given SKUs yet keeps working.
    const withSku = rows.filter((r) => r.sku)
    const withoutSku = rows.filter((r) => !r.sku)
    const syncedIds: string[] = []

    for (const [batch, onConflict] of [
      [withSku, 'supplier_id,sku'],
      [withoutSku, 'supplier_id,name_he,name_en'],
    ] as const) {
      if (batch.length === 0) continue
      const { data, error } = await supabase
        .from('products')
        .upsert(batch, { onConflict })
        .select('id')
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      syncedIds.push(...(data ?? []).map((r) => r.id))
    }

    // Anything the SHEET no longer lists is retired rather than deleted, so
    // order history keeps resolving. Products created by hand in the admin are
    // excluded: the sheet has never heard of them, and switching them off here
    // would make adding a product in the UI pointless.
    let retiredCount = 0
    if (syncedIds.length > 0) {
      const idList = syncedIds.map((id) => `"${id}"`).join(',')
      const { data: retired, error: retireError } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('supplier_id', ITAMIR_SUPPLIER_ID)
        .eq('is_active', true)
        .eq('source', 'sheet')
        .not('id', 'in', `(${idList})`)
        .select('id')

      if (retireError) {
        return NextResponse.json(
          { success: false, error: `Retire step failed: ${retireError.message}` },
          { status: 500 }
        )
      }
      retiredCount = retired?.length ?? 0
    }

    return NextResponse.json({
      success: true,
      synced: syncedIds.length,
      retired: retiredCount,
      categories: categories.size,
      hasSkuColumn,
      missingSku: withoutSku.length,
      overwritten,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
