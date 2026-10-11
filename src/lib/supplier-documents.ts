import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { SupplierDoc, SupplierDocs } from '@/app/supplier/types'

/**
 * A supplier's own files: technical sheets on products (`product_documents`)
 * and catalogues for the whole business (`supplier_documents`).
 *
 * Both sit in the public `product_documents` bucket, which is what lets a
 * carpenter open them from the product page. Business catalogues are filed
 * under `catalogs/<supplier id>/`, which is how they are told apart from the
 * documents the operator uploads to the private `supplier-documents` bucket
 * for the agent's knowledge base; those are never shown or touched here.
 */

export const BUCKET = 'product_documents'
export const CATALOG_PREFIX = 'catalogs/'

/** The object path inside the bucket, from the public URL stored on the row. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const at = url.indexOf(marker)
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length))
}

export function catalogUrl(path: string): string {
  return getSupabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function loadSupplierDocs(supplierId: string): Promise<SupplierDocs> {
  const supabase = getSupabaseAdmin()
  const [{ data: sheetRows }, { data: catalogRows }] = await Promise.all([
    supabase
      .from('product_documents')
      .select('id, product_id, title_he, doc_type, file_url, file_name, uploaded_at, products(name_he)')
      .eq('supplier_id', supplierId)
      .order('uploaded_at', { ascending: false })
      .limit(2000),
    supabase
      .from('supplier_documents')
      .select('id, file_name, file_path, document_type, description, uploaded_at')
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .like('file_path', `${CATALOG_PREFIX}%`)
      .order('uploaded_at', { ascending: false })
      .limit(50),
  ])

  const sheets: SupplierDoc[] = (
    (sheetRows ?? []) as unknown as {
      id: string
      product_id: string
      title_he: string
      doc_type: string
      file_url: string
      file_name: string
      uploaded_at: string | null
      products: { name_he: string } | null
    }[]
  ).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name_he ?? null,
    title: row.title_he,
    docType: row.doc_type,
    url: row.file_url,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
  }))

  const catalogs: SupplierDoc[] = (catalogRows ?? []).map((row) => ({
    id: row.id,
    productId: null,
    productName: null,
    title: row.description || row.file_name,
    docType: row.document_type,
    url: catalogUrl(row.file_path),
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
  }))

  return { sheets, catalogs }
}

/** Removes a sheet this supplier owns: the row, then the file. False when it is not theirs. */
export async function removeSheet(id: string, supplierId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('product_documents')
    .delete()
    .eq('id', id)
    .eq('supplier_id', supplierId)
    .select('file_url')
    .maybeSingle()
  if (!data) return false
  const path = storagePathFromUrl(data.file_url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
  return true
}

export async function removeCatalog(id: string, supplierId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('supplier_documents')
    .delete()
    .eq('id', id)
    .eq('supplier_id', supplierId)
    .like('file_path', `${CATALOG_PREFIX}%`)
    .select('file_path')
    .maybeSingle()
  if (!data) return false
  await supabase.storage.from(BUCKET).remove([data.file_path])
  return true
}
