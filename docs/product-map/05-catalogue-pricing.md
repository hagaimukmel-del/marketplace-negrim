# 5 · Catalogue & pricing
Verified: 2026-10-08

## Purpose
What can be bought and at what price: canonical products, each supplier's offer on them,
categories, product knowledge and documents, and the ways prices get in.

## Entry points
| Route | What |
|---|---|
| `POST /api/sync-products` (admin, `SyncButton`) | Pulls the Google Sheet tab `דבקים` (owner's supplier) at fixed column positions |
| `/admin/products` → import, `/supplier` → products tab | Supplier price-list upload: preview, apply, undo (`/api/supplier/import`, `/import/undo`) |
| `/api/supplier/offers`, `/api/supplier/products`, `/api/admin/products`, `/api/admin/offers` | Manual edits |
| `/api/admin/categories`, `/admin/categories` | Category tree |
| `/api/admin/product-knowledge/{specs,link}`, `/api/admin/supplier-documents(/upload)` | Specs and documents per product |

## Code
`lib/catalog.ts` (`bestOffer()`, `BASE_UNITS`), `lib/app/catalog-server.ts`, `lib/catalog-search.ts`
(the one search, shared with the agent chat),
`lib/price-import.ts` + `price-import-server.ts`, `components/import/*`,
`lib/sync-from-production.ts` (prod → staging copy script). Skill: `catalog-import`.

## Data
`products` (canonical, no price), `supplier_offers` (price excl. VAT per base unit, stock, pack,
MOQ, lead time), `categories` (10 roots + subcategories; the roots were seeded by migration `20260914160000_category_groups`, there is no `category_groups` table), `volume_pricing`,
`import_batches`, `product_specifications`, `product_documents`, `supplier_documents(_products)`,
`supplier_products` (verify use).

## Rules & invariants
See CLAUDE.md §6, "The catalogue's shape". Most important:
- `base_unit` is closed: unit/kg/liter/meter/sqm.
- A product without a live offer isn't in the catalogue.
- Prices aren't public: `lock_prices` dropped the anon policy. Check it's applied on the database you're on.
- Matching: brand + mpn, otherwise the Hebrew + English name pair.

## Status
Live but thin: essentially one supplier, mostly adhesives (about 30 offers from the sheet). Most
category roots (boards, timber, hardware, tools, machines) have no offers yet. `stock_qty` is a
placeholder 100 on synced rows. No SKU, brand or mpn data yet.

## Open tasks
T-002, T-005, T-006, T-013, T-014, T-023, T-026
