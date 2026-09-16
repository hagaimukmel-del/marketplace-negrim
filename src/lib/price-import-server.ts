import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { getSessionSupplier } from './supplier-auth'
import { isAdmin } from './admin-auth'
import { BASE_UNITS, type BaseUnit } from './catalog'
import { MAX_IMPORT_ROWS, type ImportRow, type PlanLine } from './price-import'

interface OfferRow {
  id: string
  product_id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  is_active: boolean
  products: { name_he: string } | null
}

type Target =
  | { kind: 'update'; offer: OfferRow }
  | { kind: 'unchanged'; offer: OfferRow }
  | { kind: 'attach'; productId: string }
  | { kind: 'create' }
  | { kind: 'error' }

interface Resolved {
  row: ImportRow
  line: PlanLine
  target: Target
}

export interface ImportChange {
  type: 'update' | 'create_offer' | 'create_product'
  offer_id?: string
  product_id?: string
  before?: {
    price_excl_vat: number
    stock_qty: number
    pack_label: string | null
    pack_qty: number | null
    supplier_sku: string | null
    is_active: boolean
  }
}

const key = (value: string) => value.trim().toLowerCase().replace(/["'׳״]/g, '').replace(/\s+/g, ' ')

/**
 * Who the import is for.
 *
 * A signed-in supplier imports into their own list — any supplier id in the
 * request is ignored. The operator imports on a supplier's behalf and must name
 * an approved one.
 */
export async function resolveImportSupplier(
  requestedSupplierId: unknown
): Promise<{ supplierId: string; createdBy: 'supplier' | 'admin' } | null> {
  const supplier = await getSessionSupplier()
  if (supplier) return { supplierId: supplier.id, createdBy: 'supplier' }

  if (typeof requestedSupplierId === 'string' && (await isAdmin())) {
    const { data } = await getSupabaseAdmin()
      .from('suppliers')
      .select('id')
      .eq('id', requestedSupplierId)
      .eq('status', 'approved')
      .maybeSingle()
    if (data) return { supplierId: data.id, createdBy: 'admin' }
  }
  return null
}

/** Rows as the browser sent them, re-read field by field. Nothing is trusted. */
export function sanitiseRows(input: unknown): ImportRow[] | string {
  if (!Array.isArray(input)) return 'לא התקבלו שורות'
  if (input.length === 0) return 'הקובץ ריק'
  if (input.length > MAX_IMPORT_ROWS) return `עד ${MAX_IMPORT_ROWS} שורות בקובץ אחד`

  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
  const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

  return input.map((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>
    const unit = typeof row.unit === 'string' && row.unit in BASE_UNITS ? (row.unit as BaseUnit) : null
    const stock = number(row.stock)
    const packQty = number(row.packQty)
    return {
      row: typeof row.row === 'number' ? row.row : index + 2,
      name: text(row.name, 160) ?? '',
      price: number(row.price),
      sku: text(row.sku, 80),
      stock: stock == null ? null : Math.max(0, Math.round(stock)),
      unit,
      packLabel: text(row.packLabel, 40),
      packQty: packQty != null && packQty > 0 ? packQty : null,
      brand: text(row.brand, 80),
      mpn: text(row.mpn, 80),
      category: text(row.category, 80),
    }
  })
}

/**
 * Decide what every row means, without changing anything.
 *
 * A row is this supplier's existing product when its catalogue number, or else
 * its exact name, matches one of their offers — then it is a price update, or
 * nothing at all if the numbers are the same. Otherwise, if the product exists
 * on the site under another supplier (same brand and manufacturer number, or the
 * same name), the supplier's price is attached to it. Only then is it new.
 */
async function resolve(supplierId: string, rows: ImportRow[]): Promise<Resolved[]> {
  const supabase = getSupabaseAdmin()
  const [{ data: offers }, { data: products }] = await Promise.all([
    supabase
      .from('supplier_offers')
      .select('id, product_id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, is_active, products(name_he)')
      .eq('supplier_id', supplierId)
      .limit(20000),
    supabase.from('products').select('id, name_he, brand, mpn').eq('is_active', true).limit(20000),
  ])

  const mine = (offers ?? []) as unknown as OfferRow[]
  const bySku = new Map(mine.filter((offer) => offer.supplier_sku).map((offer) => [key(offer.supplier_sku!), offer]))
  const byName = new Map(mine.filter((offer) => offer.products).map((offer) => [key(offer.products!.name_he), offer]))
  const byProduct = new Map(mine.map((offer) => [offer.product_id, offer]))

  const catalogue = products ?? []
  const byBrandMpn = new Map(
    catalogue.filter((product) => product.brand && product.mpn).map((product) => [`${key(product.brand!)}|${key(product.mpn!)}`, product.id])
  )
  const byProductName = new Map(catalogue.map((product) => [key(product.name_he), product.id]))

  const seenSku = new Set<string>()
  const seenName = new Set<string>()

  return rows.map((row) => {
    const line: PlanLine = {
      row: row.row,
      name: row.name,
      action: 'error',
      price: row.price,
      before: null,
      stock: row.stock,
      message: null,
    }
    const fail = (message: string): Resolved => ({ row, line: { ...line, message }, target: { kind: 'error' } })

    if (!row.name) return fail('חסר שם מוצר')
    if (row.price == null || row.price <= 0) return fail('מחיר חסר או לא תקין')

    const duplicateKey = row.sku ? `sku:${key(row.sku)}` : `name:${key(row.name)}`
    if ((row.sku && seenSku.has(duplicateKey)) || (!row.sku && seenName.has(duplicateKey))) {
      return fail('השורה מופיעה פעמיים בקובץ')
    }
    if (row.sku) seenSku.add(duplicateKey)
    else seenName.add(duplicateKey)

    let offer = (row.sku && bySku.get(key(row.sku))) || byName.get(key(row.name))
    if (!offer) {
      const productId =
        (row.brand && row.mpn && byBrandMpn.get(`${key(row.brand)}|${key(row.mpn)}`)) || byProductName.get(key(row.name))
      if (productId) {
        offer = byProduct.get(productId)
        if (!offer) {
          return { row, line: { ...line, action: 'attach' }, target: { kind: 'attach', productId } }
        }
      }
    }

    if (offer) {
      const before = { price: Number(offer.price_excl_vat), stock: offer.stock_qty }
      const changed =
        before.price !== row.price ||
        (row.stock != null && row.stock !== offer.stock_qty) ||
        (row.packLabel != null && row.packLabel !== offer.pack_label) ||
        (row.packQty != null && row.packQty !== Number(offer.pack_qty)) ||
        !offer.is_active
      return changed
        ? { row, line: { ...line, action: 'update', before }, target: { kind: 'update', offer } }
        : { row, line: { ...line, action: 'unchanged', before }, target: { kind: 'unchanged', offer } }
    }

    return { row, line: { ...line, action: 'create' }, target: { kind: 'create' } }
  })
}

export async function planImport(supplierId: string, rows: ImportRow[]): Promise<PlanLine[]> {
  return (await resolve(supplierId, rows)).map((item) => item.line)
}

/**
 * Apply the plan — worked out again here, never taken from the preview the
 * browser showed, in case something changed in between. Rows the person
 * unticked are skipped. Every change is written down for undo.
 */
export async function applyImport({
  supplierId,
  createdBy,
  fileName,
  rows,
  skip,
}: {
  supplierId: string
  createdBy: 'supplier' | 'admin'
  fileName: string | null
  rows: ImportRow[]
  skip: Set<number>
}) {
  const supabase = getSupabaseAdmin()
  const resolved = await resolve(supplierId, rows)

  const { data: categories } = await supabase.from('categories').select('id, name_he')
  const categoryByName = new Map((categories ?? []).map((category) => [key(category.name_he), category.id]))

  const changes: ImportChange[] = []
  const failed: { row: number; message: string }[] = []
  const summary = { updated: 0, attached: 0, created: 0, failed: 0 }
  const now = () => new Date().toISOString()

  for (const { row, target } of resolved) {
    if (skip.has(row.row)) continue

    if (target.kind === 'update') {
      const offer = target.offer
      const { error } = await supabase
        .from('supplier_offers')
        .update({
          price_excl_vat: row.price!,
          ...(row.stock != null ? { stock_qty: row.stock } : {}),
          ...(row.packLabel != null ? { pack_label: row.packLabel } : {}),
          ...(row.packQty != null ? { pack_qty: row.packQty } : {}),
          ...(row.sku && !offer.supplier_sku ? { supplier_sku: row.sku } : {}),
          is_active: true,
          updated_at: now(),
        })
        .eq('id', offer.id)
        .eq('supplier_id', supplierId)
      if (error) {
        failed.push({ row: row.row, message: error.message })
        continue
      }
      changes.push({
        type: 'update',
        offer_id: offer.id,
        before: {
          price_excl_vat: Number(offer.price_excl_vat),
          stock_qty: offer.stock_qty,
          pack_label: offer.pack_label,
          pack_qty: offer.pack_qty == null ? null : Number(offer.pack_qty),
          supplier_sku: offer.supplier_sku,
          is_active: offer.is_active,
        },
      })
      summary.updated += 1
      continue
    }

    if (target.kind === 'attach' || target.kind === 'create') {
      let productId = target.kind === 'attach' ? target.productId : null
      let createdProduct = false

      if (!productId) {
        const { data: product, error } = await supabase
          .from('products')
          .insert({
            name_he: row.name,
            name_en: row.name,
            brand: row.brand,
            mpn: row.mpn,
            base_unit: row.unit ?? 'unit',
            category_id: row.category ? categoryByName.get(key(row.category)) ?? null : null,
            is_active: true,
            created_by_supplier_id: supplierId,
          })
          .select('id')
          .single()
        if (error) {
          failed.push({
            row: row.row,
            message: error.code === '23505' ? 'מוצר עם אותו מותג ומק״ט יצרן כבר קיים' : error.message,
          })
          continue
        }
        productId = product.id
        createdProduct = true
      }

      const { data: offer, error: offerError } = await supabase
        .from('supplier_offers')
        .insert({
          product_id: productId,
          supplier_id: supplierId,
          price_excl_vat: row.price!,
          stock_qty: row.stock ?? 0,
          supplier_sku: row.sku,
          pack_label: row.packLabel,
          pack_qty: row.packQty,
          is_active: true,
          source: 'manual',
        })
        .select('id')
        .single()

      if (offerError) {
        if (createdProduct) await supabase.from('products').delete().eq('id', productId)
        failed.push({
          row: row.row,
          message: offerError.code === '23505' ? 'המק״ט כבר קיים אצלך על מוצר אחר' : offerError.message,
        })
        continue
      }

      if (createdProduct) changes.push({ type: 'create_product', product_id: productId })
      changes.push({ type: 'create_offer', offer_id: offer.id, product_id: productId })
      if (createdProduct) summary.created += 1
      else summary.attached += 1
    }
  }

  summary.failed = failed.length

  const { data: batch, error } = await supabase
    .from('import_batches')
    .insert({
      supplier_id: supplierId,
      created_by: createdBy,
      file_name: fileName,
      summary,
      changes: changes as unknown as never,
    })
    .select('id')
    .single()

  if (error) throw new Error(`השינויים נשמרו, אבל רישום הייבוא נכשל: ${error.message}`)

  return { batchId: batch.id, summary, failed }
}

/**
 * Put everything an import changed back as it was.
 *
 * Prices return to their previous values, offers the import added are removed,
 * and products it created go too — unless another supplier has started selling
 * them since, in which case they stay. Within seven days, once.
 */
export async function undoImport(batchId: string, supplierId: string) {
  const supabase = getSupabaseAdmin()
  const { data: batch } = await supabase
    .from('import_batches')
    .select('id, changes, created_at, undone_at')
    .eq('id', batchId)
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (!batch) return { error: 'הייבוא לא נמצא', status: 404 }
  if (batch.undone_at) return { error: 'הייבוא הזה כבר בוטל', status: 409 }
  if (Date.now() - new Date(batch.created_at).getTime() > 7 * 86_400_000) {
    return { error: 'אפשר לבטל ייבוא עד 7 ימים אחריו', status: 409 }
  }

  const changes = (batch.changes ?? []) as unknown as ImportChange[]

  for (const change of changes) {
    if (change.type === 'update' && change.offer_id && change.before) {
      await supabase
        .from('supplier_offers')
        .update({ ...change.before, updated_at: new Date().toISOString() })
        .eq('id', change.offer_id)
        .eq('supplier_id', supplierId)
    }
    if (change.type === 'create_offer' && change.offer_id) {
      await supabase.from('supplier_offers').delete().eq('id', change.offer_id).eq('supplier_id', supplierId)
    }
  }

  for (const change of changes) {
    if (change.type !== 'create_product' || !change.product_id) continue
    const { count } = await supabase
      .from('supplier_offers')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', change.product_id)
    if ((count ?? 0) > 0) continue
    const { error } = await supabase.from('products').delete().eq('id', change.product_id)
    if (error) {
      await supabase.from('products').update({ is_active: false }).eq('id', change.product_id)
    }
  }

  await supabase.from('import_batches').update({ undone_at: new Date().toISOString() }).eq('id', batch.id)
  return { ok: true }
}
