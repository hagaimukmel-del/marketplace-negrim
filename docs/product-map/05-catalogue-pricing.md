# 5 · Catalogue & pricing
Verified: 2026-10-12

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
MOQ, lead time), `categories` (10 roots + subcategories; the roots were seeded by migration `20260914160000_category_groups`, there is no `category_groups` table), `volume_pricing` (kept, no longer read since 2026-10-12),
`import_batches`, `product_specifications`, `product_documents`, `supplier_documents(_products)`,
`supplier_products` (verify use).

## Rules & invariants
See CLAUDE.md §6, "The catalogue's shape". Most important:
- `base_unit` is closed: unit/kg/liter/meter/sqm.
- A product without a live offer isn't in the catalogue.
- Prices aren't public: `lock_prices` dropped the anon policy. Check it's applied on the database you're on.
- Matching: brand + mpn, otherwise the Hebrew + English name pair.
- Delivery regions (`suppliers.delivery_regions`, `lib/delivery.ts`): with the carpentry's city,
  `loadProducts` marks each offer `delivers` and never suggests a supplier outside the carpentry's
  region while another one reaches it. bestOffer() decides among the rest. Empty = unknown.
- Price mode (`suppliers.price_mode`, `lib/price-mode.ts`, T-023): a supplier on 'quote' keeps its
  prices in `supplier_offers`, but every reader outside its own console leaves them out
  (`price: null`, `quoteOnly: true`) and they never decide the suggested offer. Carpenters ask for
  a quote (`quote_requests`); `/api/orders` orders from such a supplier only at an answered quote.
- Quote rules (stage 1 of the 2026-10-12 RFQ plan, `lib/quote-rules.ts`, migration
  `20261012090000_quote_rules`): a request goes to the one supplier chosen. Quote-only supplier:
  from `min_order_qty` up (`kind = 'quote'`); if it also set a threshold, the product page says
  "יש מחיר מיוחד מ־…" and a request from that quantity up is `kind = 'volume'` (owner, 14.10).
  Priced supplier: only a special price, only from `supplier_offers.special_price_min_qty`, which
  the supplier sets in packs; no threshold, no special price (`kind = 'volume'`). The threshold is stored with the pack size it was set for
  (`special_price_pack_qty`) and is out of use while the pack differs, until the supplier confirms
  it. `client_request_id` makes a repeated send return the saved request (same details) or 409.
  Old requests have no `kind`. No automatic quantity tiers anywhere (`volume_pricing` is unread).
- Special price value (owner, 14.10, migration `20261014110000_special_price_value`): with the
  threshold the supplier may set `supplier_offers.special_price_excl_vat` (per base unit). A request
  that reaches the threshold is then answered at once with it (`instantQuotePrice`), as an ordinary
  quote valid 14 days that the carpenter accepts from its quotes; supplier and carpenter are mailed.
  The price is never shown before asking and never changes a cart price by itself.

## Status
Live but thin: essentially one supplier, mostly adhesives (about 30 offers from the sheet). Most
category roots (boards, timber, hardware, tools, machines) have no offers yet. `stock_qty` is a
placeholder 100 on synced rows. No SKU, brand or mpn data yet.

## Open tasks
T-002, T-005, T-006, T-013, T-014, T-023, T-026
