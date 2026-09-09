@AGENTS.md

# Marketplace Negrim — Claude Code Core Instructions

## 1. Coding & Architecture Rules
- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`).
- **Server Components First**: Default to Server Components. Add `'use client'` ONLY for interactive components (forms, cart context, dialogs).
- **No Direct API Waterfalls**: Fetch data directly in Server Components using Supabase server clients.
- **Form Validation**: Always validate mutations using Zod + Server Actions.

## 2. Design & UI System
- **UI Framework**: Shadcn/ui + Radix Primitives + Lucide Icons.
- **RTL & Hebrew**: Ensure all layouts natively support RTL (`dir="rtl"`). Use logical Tailwind properties (`ms-*`, `me-*`, `ps-*`, `pe-*`).
- **B2B Data Density**: Prioritize table-based layouts, quick filter bars, sticky headers, and clear price badges (excl. VAT vs incl. VAT).
- **Responsive**: Mobile-first approach for job-site ordering, desktop-optimized for back-office purchasing.

## 3. Database & Security (Supabase & RLS)
- **No Client-side Bypasses**: Never write security logic solely in React/Next.js. Always enforce at DB level with RLS.
- **RLS Performance**: Use Security Definer functions or JWT claims for `organization_id` checks to prevent subquery loops on `organization_members`.
- **Migrations**: Never modify DB schema manually in the dashboard. Always write migrations in `supabase/migrations/`.
- **Type Safety**: Run `supabase gen types typescript --local > types/supabase.ts` after any migration.

## 4. Execution Workflow (Per Task)
1. **Audit**: Read current code/schema first.
2. **Types**: Ensure Typescript types are strictly updated (No `any`).
3. **Implementation**: Code component/route with RSC & Optimistic UI where applicable.
4. **Validation**: Run `npm run build` and verify no TypeScript or linting errors exist.
5. **Git Commit**: Commit clean, scoped changes at the end of each task.

## 5. Business Rules (binding)
- **The supplier is the seller of record.** The supplier fulfils the order, sets payment terms
  (שוטף+30 / שוטף+60 / other), and issues the invoice directly to the carpenter.
- **Marketplace Negrim never collects payment for goods and never issues a product invoice.**
  Do not add a payment/checkout gateway to the MVP. The existing Stripe and PayPal routes are
  out of scope and must not be extended.
- **Checkout ends at "order sent".** Flow: send order → supplier confirms → supplies → invoices
  the carpenter. Order status values reflect fulfilment, never payment.
- **An order is a purchase order (הזמנת רכש), not an invoice.** Store prices excl. VAT; VAT is
  indicative display only. Never render a document that could be mistaken for a חשבונית.
- **Amounts are snapshots.** Store `unit_price` at time of order and never recompute from the
  current price. The supplier's confirmed amount — not the submitted amount — is the basis for
  any commission calculation.
- **Revenue model**: commission billed to the supplier (`supplier_commission`, `commission_rate`
  stored as snapshots on the supplier order) and/or supplier subscription. Not a cut of payment.

## 6. Current State vs Target — read before assuming
Last verified 2026-09-09 by running the checks, not from memory. Re-verify before trusting it.

| Rule says | Actually in the repo now |
|---|---|
| `@supabase/ssr`, server clients | Still only `@supabase/supabase-js`. Two clients: `lib/supabase.ts` (browser, public key, catalogue reads only) and `lib/supabase-admin.ts` (service role, `server-only`, everything else) |
| Server Components first | 25 of 54 files are `'use client'`. `/admin/*` and `/o/[token]` are Server Components that hand data to a client island; the carpenter pages are still client-rendered |
| Zod + Server Actions | `zod` is still not a declared dependency. Mutations go through `/api/*` route handlers with hand-written validation |
| Shadcn/ui + Radix + Lucide | **Lucide is in.** No shadcn/Radix and no `components.json`; components are hand-written Tailwind on the tokens in `globals.css` |
| Migrations in `supabase/migrations/` | **Done.** 7 migrations, CLI linked, `npm run db:push` / `db:types` work. Never edit schema in the dashboard |
| `supabase gen types typescript` | **Done.** `npm run db:types` regenerates `lib/database.types.ts`; hand-written aliases live in `lib/db.ts` so they survive regeneration |
| No `any` | `npm run lint`: 16 errors, 9 warnings, mostly `no-explicit-any` in older files. Treat lint-clean as "no new errors" |
| `npm run build` clean | Passes |

**Resolved since this file was written — do not re-report these:**
- `orders.items_json` is gone. Orders are `orders` → `order_items` with `unit_price_excl_vat`
  and `product_name_he` snapshotted at order time (migration 0004).
- The mock supplier area and its `DEMO_SUPPLIERS` / localStorage login are deleted, along with
  the unused `Navbar` and `AdminNavbar` (which linked to seven routes that never existed).
- `/admin/*` exists: results, orders, campaigns, carpenters, login. Gated by ADMIN_PASSWORD +
  ADMIN_SECRET, verified in a Server Component and re-checked in every admin route handler.
- VAT lives in `lib/vat.ts` and is snapshotted onto each order as `orders.vat_rate`.
- Only one profile table matters (`user_profiles`); `profiles` is legacy and unused.

**Known gaps, in the order they matter:**
- Nothing notifies the operator when an order arrives — `/admin/orders` has to be opened. Needs
  a mail provider and an API key.
- Product images are Google Drive share links that do not render when hot-linked. The UI skips
  the request and shows an initials tile; the real fix is rehosting on Supabase Storage.
- 44 emoji remain, all in files off the main path: `design-system`, the auth pages,
  `ProductCard`, `VolumePricingTable`, `GatedPriceGuard`, `ProtectedRoute`.
- `/auth/login`, `/auth/signup`, `ProtectedRoute` and `GatedPriceGuard` are from the abandoned
  account model. Nothing on the live path uses them. Candidates for deletion.
- `products.stock_qty` is 100 for every row because the sync writes a constant. Do not display
  it as though it were real.

**Security model, so it is not re-derived each time:**
- The public key is read-only and reaches only `products`, `categories`, `volume_pricing`.
- `carpenters`, `orders`, `order_items`, `campaigns`, `order_intents`, `offer_events` have RLS
  on and no policy: reachable only through server code holding the service role.
- A carpenter is identified by the token in `/o/[token]`, remembered in localStorage for the
  visit. Every server use re-resolves it against the database; nothing trusts a client-supplied
  id. Order reads are scoped to the owning carpenter.
- `/api/join` is the only public endpoint that writes. It dedupes on the last 9 phone digits, so
  repeated submissions return the same link instead of creating rows.
