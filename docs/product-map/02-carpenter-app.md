# 2 · Carpenter purchasing app (`/app`)
Verified: 2026-10-03

## Purpose
Where a carpenter buys: browse the catalogue, compare suppliers on a product, build a cart that
splits per supplier, send purchase orders, track them, and reorder.

## Entry points
| Route | What |
|---|---|
| `/app` | Home (`HomeView`) |
| `/app/catalog`, `/app/catalog/[id]` | Catalogue and category view; search across name, brand, mpn, supplier |
| `/app/product/[id]` | Product page: offers, **"השוואת ספקים"** and **"החלף ספק"** when more than one supplier sells it, "הזול במלאי" badge, last-ordered supplier |
| `/app/order` | Cart → send. Grouped by supplier, with each supplier's minimum shown when it isn't met plus suggestions to close the gap (`POST /api/app/quote`) |
| `/app/orders`, `/app/orders/[id]` | Order history and status (`/api/app/orders/[id]`, `/api/carpenter/orders`) |
| `/app/account` | Profile (`/api/carpenter/profile`) |
| `/app/demo` | Static marketing/demo page. Uses emoji and old styling |
| `/carpenter/*` | Redirects to `/app/*` (`next.config.ts`) |
| `/order` (route group `(app)`) | **Legacy** search page with a Web Speech mic button. Not linked from the app |

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
Live since 18.09. Supplier comparison and switching are built but **dormant**: with one live
supplier, no product shows them.

## Open tasks
T-002, T-005, T-006, T-018
