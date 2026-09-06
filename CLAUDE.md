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
The sections above describe the **target** stack. As of 2026-09-06 the repo does not match it yet.
Do not assume these exist; install or build them as part of the task that first needs them, and
update this section when the gap closes.

| Rule says | Actually in the repo now |
|---|---|
| `@supabase/ssr`, server clients | Only `@supabase/supabase-js`, one shared browser client in `src/lib/supabase.ts` |
| Server Components first | 29 of 45 source files are `'use client'`; nearly every page is a client component |
| Zod + Server Actions | `zod` is only a transitive dependency (not in `package.json`); mutations go through `/api/*` route handlers |
| Shadcn/ui + Radix + Lucide | None installed, no `components.json`; UI is hand-written Tailwind with emoji icons |
| Migrations in `supabase/migrations/` | No `supabase/` directory and no CLI. Schema was applied by hand and **has drifted** from `docs/*.sql` |
| `supabase gen types typescript` | No local Supabase setup; types are hand-written in `src/lib/types.ts` and partly stale vs the live DB |
| No `any` | `npm run lint` currently reports ~43 errors, mostly `@typescript-eslint/no-explicit-any` |
| `npm run build` clean | Passes as of 2026-09-06. `npm run lint` does **not** — treat lint-clean as "no new errors" until the backlog is cleared |

**Known blockers to fix before building on top of them:**
- `orders.items_json` (JSONB blob) makes per-supplier RLS impossible. Must be replaced by
  `supplier_orders` → `order_items` before supplier isolation can work.
- Supplier auth is a hardcoded `DEMO_SUPPLIERS` array plus a `localStorage` session — any visitor
  can reach `/supplier`. Must be replaced by Supabase Auth.
- Two parallel profile tables (`profiles`, `user_profiles`) and two parallel order schemas
  (normalized `sub_orders`/`order_items` vs flat `items_json`). Pick one, delete the other.
- VAT is hardcoded as `* 1.18` inside `src/lib/cart-context.tsx`. It belongs on the order record.
- No `/admin/*` routes exist, though `Navbar` and `AdminNavbar` link to seven of them.
