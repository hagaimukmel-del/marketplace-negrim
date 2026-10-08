# 2 · Carpenter purchasing app (`/app`)
Verified: 2026-10-08

## Purpose
Where a carpenter buys: browse the catalogue, compare suppliers on a product, build a cart that
splits per supplier, send purchase orders, track them, and reorder.

## Entry points
| Route | What |
|---|---|
| `/app` | Home (`HomeView`) |
| `/app/catalog`, `/app/catalog/[id]` | Catalogue and category view; search across name, brand, mpn, supplier |
| `/app/product/[id]` | Product page: offers, **"השוואת ספקים"** and **"החלף ספק"** when more than one supplier sells it, "הזול במלאי" badge, last-ordered supplier |
| `/app/order` | Cart ("עגלה" in the menu) → send. Grouped by supplier, with each supplier's minimum shown when it isn't met plus suggestions to close the gap (`POST /api/app/quote`). Links to `/doc/quote`, a printable price quote per supplier |
| `/app/orders`, `/app/orders/[id]` | Order history and status (`/api/app/orders/[id]`, `/api/carpenter/orders`). The order page links to `/doc/order/[id]` |
| `/app/account` | Profile (`/api/carpenter/profile`) |
| `/app/demo` | Static marketing/demo page. Uses emoji and old styling |
| `/carpenter/*` | Redirects to `/app/*` (`next.config.ts`) |

## Code
`src/app/app/**`, `src/components/app/*` (`AppShell`, `ProductList`, `useReorder`…),
`lib/app/*` (`catalog-server.ts`, `products.ts` with `sortedOffers`/`suggestedOffer`,
`orders-server.ts`, `format.ts`, `access.ts` = maintenance switch), `lib/cart-context.tsx`, `lib/vat.ts`.

## Data
Reads `products`, `supplier_offers`, `suppliers` (server-side), `categories`; writes `orders`,
`order_items` via area 4.

## Rules & invariants
- Prices are fetched on the server and only for a signed-in carpenter (`lock_prices`, CLAUDE.md §6).
- Supplier names stay in server components (the `suppliers` table is closed to the browser).
- Prices are excl. VAT and per base unit; VAT is display only (`lib/vat.ts`).
- `bestOffer()` / `suggestedOffer()` decide the default supplier: in stock first, then cheapest. Don't re-implement them.

## Status
Live since 18.09. Catalogue rows and the product page show the product photo where one is
uploaded (Supabase Storage; Drive links fall back to the category glyph) and the product page shows
`description_he`. Signed-out visitors see a registration line above every product list.
`stock_qty` is not read as stock (`STOCK_IS_TRACKED = false` in `catalog-server.ts`): nothing shows
"אזל" or is blocked from ordering until a supplier keeps stock current. Supplier comparison and switching are built but **dormant**: with one live
supplier, no product shows them.

## Open tasks
T-002, T-005, T-006, T-018, T-023, T-024, T-025, T-026, T-027
