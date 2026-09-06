import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'

type ProductInsert = Database['public']['Tables']['products']['Insert']

const SHEET_ID = '1pSde0xYLViLEy9Nxp-qSGrBuqcZPd4o5dDlJntoSS6c'
const SHEET_NAME = 'דבקים'
const ITAMIR_SUPPLIER_ID = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'

/**
 * Column positions in the sheet. Index-based because several headers are
 * duplicated across languages and cannot be matched by name.
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
 * Prices arrive as "820₪" or "1,250₪".
 *
 * The previous implementation stripped the shekel sign and called parseFloat on
 * what was left, and parseFloat('1,250') is 1 — it stops at the separator. That
 * wrote eight products worth 1,200-1,450 ILS into the catalogue at 1.00 ILS.
 * Strip every character that is not a digit or a decimal point.
 */
function parsePrice(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^\d.]/g, '')
  const value = Number.parseFloat(cleaned)
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

function cell(row: string[], index: number): string {
  return (row[index] ?? '').trim()
}

interface SheetProduct extends ProductInsert {
  _category: string
}

async function readSheet(): Promise<SheetProduct[]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Sheet fetch failed: ${response.status} ${response.statusText}`)
  }

  // A real CSV parser, not a hand-rolled split. The old one mis-handled quoted
  // commas, which shifted every later column by one and wrote the category into
  // the name for 32 of the 62 rows.
  const rows: string[][] = parse(await response.text(), {
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })

  return rows
    .slice(1)
    .map((row): SheetProduct | null => {
      const nameHe = cell(row, COL.nameHe)
      const nameEn = cell(row, COL.nameEn)
      const price = parsePrice(cell(row, COL.price))

      if (!nameHe && !nameEn) return null
      if (price <= 0) return null

      return {
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
        _category: cell(row, COL.category),
      }
    })
    .filter((product): product is SheetProduct => product !== null)
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
  try {
    const supabase = getSupabaseAdmin()
    const sheetProducts = await readSheet()

    if (sheetProducts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No usable rows found in the sheet' },
        { status: 422 }
      )
    }

    const categories = await resolveCategories(sheetProducts.map((p) => p._category))

    const rows: ProductInsert[] = sheetProducts.map(({ _category, ...product }) => ({
      ...product,
      category_id: categories.get(_category) ?? null,
      updated_at: new Date().toISOString(),
    }))

    // Upsert on the natural key from migration 0003. The old route always
    // inserted, so every run duplicated the whole catalogue.
    const { data, error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'supplier_id,name_he,name_en' })
      .select('id')

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Anything this supplier still has that the sheet no longer lists is
    // retired rather than deleted, so order history keeps resolving.
    const syncedIds = (data ?? []).map((row) => row.id)
    let retiredCount = 0

    if (syncedIds.length > 0) {
      const idList = syncedIds.map((id) => `"${id}"`).join(',')
      const { data: retired, error: retireError } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('supplier_id', ITAMIR_SUPPLIER_ID)
        .eq('is_active', true)
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
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
