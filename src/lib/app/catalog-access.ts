import 'server-only'

import { isAdmin } from '@/lib/admin-auth'
import { getSessionCarpenter, type SessionCarpenter } from '@/lib/carpenter-auth'
import { getSessionSupplier } from '@/lib/supplier-auth'

/**
 * Who may look inside the catalogue (owner, 2026-11-08).
 *
 * A visitor who has not registered sees the list of categories and, inside a
 * category or a search, each product's photo, name and supplier (owner,
 * 2026-11-11; search and supplier names opened 2026-11-12). No product page
 * and no price. A signed-in
 * carpentry, an approved supplier and the operator see the catalogue as before.
 * Prices are a separate, narrower question (carpentry or operator only).
 *
 * Enforced on the server in each page, never only by hiding links: a direct URL
 * to a category or a product gets the sign-up prompt instead of the content.
 */
export interface CatalogViewer {
  carpenter: SessionCarpenter | null
  admin: boolean
  supplier: boolean
  /** May open categories, products and see who sells them. */
  mayBrowse: boolean
  /** May see supplier prices. */
  showPrices: boolean
}

export async function loadCatalogViewer(): Promise<CatalogViewer> {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  // The supplier session costs a read, so it is asked only when it decides something.
  const supplier = !carpenter && !admin ? Boolean(await getSessionSupplier()) : false
  return {
    carpenter,
    admin,
    supplier,
    mayBrowse: Boolean(carpenter) || admin || supplier,
    showPrices: Boolean(carpenter) || admin,
  }
}
