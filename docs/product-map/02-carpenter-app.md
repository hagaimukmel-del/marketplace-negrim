# 2 · Carpenter purchasing app (`/app`)
Verified: 2026-11-12

## Purpose
Where a carpenter buys: browse the catalogue, compare suppliers on a product, build a cart that
splits per supplier, send purchase orders, track them, and reorder.

## Entry points
| Route | What |
|---|---|
| `/app` | Home (`HomeView`) |
| `/app/catalog`, `/app/catalog/[id]` | Catalogue and category view; search across name, brand, mpn, supplier |
| `/app/product/[id]` | Product page: offers, **"השוואת ספקים"** and **"החלף ספק"** when more than one supplier sells it, "הזול במלאי" badge, last-ordered supplier. A visitor sees the product, its documents and its supplier through `forVisitor` (no price, terms, comparison or buy box), 12.11 |
| `/app/suppliers`, `/app/suppliers/[id]` | Supplier list and each supplier's page (12.11): logo, name, city, "מה אנחנו מוכרים", delivery regions, catalogues, its products, "שאלה לספק". Open to anyone; terms (payment, minimum, lead time, free delivery) and prices for registered carpentries only. Code: `lib/app/suppliers-public.ts`, `components/app/SupplierCard.tsx`. Listed only when approved, not a test business, and selling at least one live product. Each opening bumps `supplier_page_views` (migration `20261112100000`, not applied yet: needs the work PC), never for the operator, the supplier itself or a prefetch |
| WhatsApp / call to the supplier | Main action on the product page and the supplier page (owner 12.11; the purchase order stays as the quieter option). `components/app/SupplierContactButtons.tsx`, numbers from `lib/supplier-contact(-server).ts`: only numbers the supplier entered itself (console → פרטי העסק, `contact_phone` / `whatsapp_phone` / `contact_confirmed_at`), never the business phone (owner 12.11: WhatsApp is the supplier's choice; without it carpentries write in the site as before). Numbers reach registered carpentries and the operator only; a visitor's button goes to `/join?next=…?contact=1` and back. Prepared text "שלום, הגעתי מנגרים B2B לגבי…" with the product link. Each press → `contact_clicks` with `source` + `product_id` via `/api/app/suppliers/[id]/contact` (migration `20261112130000`, not applied yet; without it the press is kept without those two) |
| `/app/order` | Cart ("עגלה" in the menu) → send. Grouped by supplier, with each supplier's minimum shown when it isn't met plus suggestions to close the gap (`POST /api/app/quote`). Links to `/doc/quote`, a printable price quote per supplier |
| `/app/orders`, `/app/orders/[id]` | Order history and status (`/api/app/orders/[id]`, `/api/carpenter/orders`). The order page links to `/doc/order/[id]` |
| `/app/quotes` | "הצעות מחיר" (T-023): requests sent, answers to add to the cart or turn down (`/api/carpenter/quotes`, `/api/carpenter/quotes/[id]`). A request is sent from the product page ("בקש הצעת מחיר" for a quote-only supplier, "הזמנה גדולה? בקשו הצעת מחיר" otherwise; `?quote=1` opens it on arrival, which the agent uses). In the desktop menu with a count of answered quotes; on a phone, a card on `/app/orders` and the orders dot |
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
- Every `/app` page is read fresh from the database; `src/app/app/loading.tsx` shows a skeleton the
  moment a link is tapped, so a tap never looks ignored. Keep it when adding pages.
- Messages (`/app/messages`, bell in `AppShell`): threads with suppliers per question or order,
  `lib/messages.ts`. A carpentry writes to an approved supplier or about its own order.
- The product page lists technical sheets (`product_documents`) from suppliers that sell the
  product today, shows supplier logos and "לא מגיע לאזור שלך". The order page shows a supplier's
  delivery date, lines it will not supply, and a rejection reason.
- Prices are fetched on the server and only for a signed-in carpenter (`lock_prices`, CLAUDE.md §6).
- A visitor who has not registered sees the category list on `/app/catalog` and, inside a category or a search, each product's photo, name and supplier name and logo (`PublicProductGrid` / `toPublicProduct`; photo and name owner 11.11, search and supplier names owner 12.11). A search that names a supplier also shows its card. No price and no supplier terms; `catalog-gate.test.ts` checks that only those six fields leave the server.
- Home (`/app`): search sits at the top on a phone (the desktop head always carries it), then the weekly promotion, then the Metzion and work-network cards above the categories. דרושים appears on home only once `JOBS_BOARD_OPEN` is set (product review 12.11).
  Category pages, product pages and search answer with `CatalogLocked` (sign-up prompt) and read
  no product, supplier or promotion. Carpentries, approved suppliers and the operator browse as
  before. One check, `lib/app/catalog-access.ts` (`loadCatalogViewer`), tested in
  `src/app/app/catalog-gate.test.ts`. Migration `20261108190000_lock_products` closes the public
  read of `products` to match.
- Supplier names stay in server components (the `suppliers` table is closed to the browser).
- Prices are excl. VAT and per base unit; VAT is display only (`lib/vat.ts`).
- `bestOffer()` / `suggestedOffer()` decide the default supplier: in stock first, then cheapest. Don't re-implement them.

- Categories with products come first; empty ones are folded under "בקרוב" (`CategoryList`), and the home strip shows only filled ones (11.11).
- Phone bottom bar: בית, קטלוג, עגלה, הזמנות, מציאון. The account is the avatar in the top bar. The desktop sidebar hides דרושים while it is closed (11.11).

## Status
Live since 18.09. Product lists are photo-led cards (2 columns on phone, up to 4 on desktop; the
desktop table was dropped on 26.10 at the owner's request). A real photo opens full size on tap
(`ProductImage` with `zoom`); without one the category glyph links to the product page. Photos come
from Supabase Storage; Drive links fall back to the glyph. The product page shows
`description_he`. Signed-out visitors no longer reach a product list (see Rules).
Above every category and search list (27.10): a sort (מומלץ = photo first then most viewed, price
both ways, הכי נצפים, חדשים) and filters (price range with suggested ranges, "עם תמונה", supplier,
"אזור הספק" = where the supplier sits or delivers, brand), in a bottom sheet on a phone with a
"באזור שלי" shortcut. Logic in `lib/app/catalog-filters.ts` (tested); state lives in the URL
(`sort img min max sup reg brand`). A filter is only offered when it would split the list.
"הכי נצפים" counts product page openings in `product_view_counts` (migration
`20261027072150_product_views`, `bump_product_view()`, service role only), not the operator's and
not prefetches; ties go to the product on more purchase orders. Only a rank reaches the browser.
`stock_qty` is not read as stock (`STOCK_IS_TRACKED = false` in `catalog-server.ts`): nothing shows
"אזל" or is blocked from ordering until a supplier keeps stock current. Supplier comparison and switching are built but **dormant**: with one live
supplier, no product shows them.

## Open tasks
T-002, T-005, T-006, T-018, T-023, T-024, T-025, T-026, T-027, T-036
