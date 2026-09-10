import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'
import type { Database } from '@/lib/database.types'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type OfferInsert = Database['public']['Tables']['supplier_offers']['Insert']

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

/**
 * The key a sheet row is matched to an existing product by. Both names, because
 * the Hebrew one alone is not unique in this sheet.
 */
function matchKey(nameHe: string, nameEn: string | null): string {
  return `${nameHe.trim()}\u0000${(nameEn ?? '').trim()}`
}

/**
 * One sheet row, before it is split into the two things it actually describes:
 * a product the marketplace lists, and Itamir's offer on it.
 */
interface SheetProduct {
  sku: string | null
  name_he: string
  name_en: string
  name_ar: string | null
  description_he: string | null
  description_en: string | null
  price: number
  image_url: string | null
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
        price,
        image_url: normaliseImageUrl(cell(row, COL.imageUrl)),
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

/**
 * Rebuild Itamir's catalogue from its sheet.
 *
 * The sheet describes two things at once, and the sync now separates them the
 * way the schema does: the product (what the item is, shared by every supplier
 * that carries it) and the offer (what Itamir charges for it). This is the same
 * shape a supplier file upload will take — the sheet stops being a special case
 * and becomes simply the first importer.
 *
 * Products are matched on the Hebrew AND English name together, because this
 * sheet carries neither a brand nor a manufacturer part number. The pair is
 * load-bearing, not belt-and-braces: the sheet lists "קלינר Q1924 ניקוי EVA"
 * twice, at 1,200 and at 89, and only the English name says which is the small
 * pack. Matching on the Hebrew name alone merges two real products into one and
 * loses a price.
 *
 * That is the weak key doing its worst, and exactly why the upload path being
 * built for other suppliers asks a human to confirm a match rather than guess.
 */
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

    // ---- the products ---------------------------------------------------
    const names = [...new Set(sheetProducts.map((p) => p.name_he))]
    const { data: known, error: knownError } = await supabase
      .from('products')
      .select('id, name_he, name_en')
      .in('name_he', names)

    if (knownError) {
      return NextResponse.json({ success: false, error: knownError.message }, { status: 500 })
    }

    const productIdByName = new Map(
      (known ?? []).map((row) => [matchKey(row.name_he, row.name_en), row.id])
    )

    const toInsert: ProductInsert[] = sheetProducts
      .filter((p) => !productIdByName.has(matchKey(p.name_he, p.name_en)))
      .map((p) => ({
        name_he: p.name_he,
        name_en: p.name_en,
        name_ar: p.name_ar,
        description_he: p.description_he,
        description_en: p.description_en,
        image_url: p.image_url,
        category_id: categories.get(p._category) ?? null,
        base_unit: 'unit',
        is_active: true,
      }))

    if (toInsert.length > 0) {
      const { data: created, error: insertError } = await supabase
        .from('products')
        .insert(toInsert)
        .select('id, name_he, name_en')

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
      for (const row of created ?? []) {
        productIdByName.set(matchKey(row.name_he, row.name_en), row.id)
      }
    }

    // The sheet owns the descriptive side of the products it introduced.
    for (const p of sheetProducts) {
      const id = productIdByName.get(matchKey(p.name_he, p.name_en))
      if (!id) continue
      await supabase
        .from('products')
        .update({
          name_en: p.name_en,
          name_ar: p.name_ar,
          description_he: p.description_he,
          description_en: p.description_en,
          image_url: p.image_url,
          category_id: categories.get(p._category) ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    // ---- the offers -----------------------------------------------------
    // Which SKUs already existed is answered before writing, so the report can
    // say what was replaced rather than only what was touched.
    const incomingSkus = sheetProducts
      .map((p) => p.sku)
      .filter((sku): sku is string => Boolean(sku))

    const { data: existingOffers } = incomingSkus.length
      ? await supabase
          .from('supplier_offers')
          .select('supplier_sku, products(name_he)')
          .eq('supplier_id', ITAMIR_SUPPLIER_ID)
          .in('supplier_sku', incomingSkus)
      : { data: [] }

    const overwritten = (existingOffers ?? [])
      .filter((row) => row.supplier_sku)
      .map((row) => ({
        sku: row.supplier_sku as string,
        name_he: (row.products as { name_he: string } | null)?.name_he ?? '',
      }))

    // Keyed by product so two sheet rows can never resolve to the same offer.
    // Postgres rejects an upsert that touches one row twice, which took the
    // whole sync down rather than just the offending pair.
    const offerByProduct = new Map<string, OfferInsert>()
    const collided: string[] = []

    for (const p of sheetProducts) {
      const productId = productIdByName.get(matchKey(p.name_he, p.name_en))
      if (!productId) continue
      if (offerByProduct.has(productId)) collided.push(p.name_he)
      offerByProduct.set(productId, {
        product_id: productId,
        supplier_id: ITAMIR_SUPPLIER_ID,
        supplier_sku: p.sku,
        price_excl_vat: p.price,
        stock_qty: 100,
        is_active: true,
        source: 'sheet',
        updated_at: new Date().toISOString(),
      })
    }

    const offers = [...offerByProduct.values()]

    const { data: syncedOffers, error: offerError } = await supabase
      .from('supplier_offers')
      .upsert(offers, { onConflict: 'product_id,supplier_id' })
      .select('id, product_id')

    if (offerError) {
      return NextResponse.json({ success: false, error: offerError.message }, { status: 500 })
    }

    // ---- retire what the sheet dropped ----------------------------------
    // The OFFER is switched off, not the product: another supplier may carry
    // the same item, and order history has to keep resolving either way.
    // Offers added by hand in the console are left alone — the sheet has never
    // heard of them.
    let retiredCount = 0
    const syncedProductIds = (syncedOffers ?? []).map((row) => row.product_id)
    if (syncedProductIds.length > 0) {
      const idList = syncedProductIds.map((id) => `"${id}"`).join(',')
      const { data: retired, error: retireError } = await supabase
        .from('supplier_offers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('supplier_id', ITAMIR_SUPPLIER_ID)
        .eq('is_active', true)
        .eq('source', 'sheet')
        .not('product_id', 'in', `(${idList})`)
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
      synced: syncedOffers?.length ?? 0,
      created: toInsert.length,
      retired: retiredCount,
      categories: categories.size,
      hasSkuColumn,
      missingSku: sheetProducts.filter((p) => !p.sku).length,
      overwritten,
      // Two sheet rows that resolved to one product. The later row won, and the
      // earlier one's price is simply gone - worth saying out loud.
      collided: [...new Set(collided)],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
