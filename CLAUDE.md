@AGENTS.md

# Marketplace Negrim — Claude Code Core Instructions

## 0. What this is and where it is going
**Marketplace Negrim (nagarimb2b.com, "שוק הנגרים")** is a Hebrew, RTL, B2B ordering platform for
Israeli carpentry shops (נגריות). Carpenters browse a catalogue of consumables, hardware and
machines and send **purchase orders** directly to suppliers; suppliers confirm, deliver and invoice
the carpenter themselves. Next to it is **המציאון**, a green board where carpenters pass on leftover
materials and equipment to each other.

**Goal now (draft 2026-10-03, confirm with the owner before relying on it):**
1. A real pilot: carpentries ordering through the site, with orders reaching suppliers and getting confirmed.
2. More than one supplier. Today the catalogue is essentially one supplier (the owner's adhesives
   business, "איתמיר"). The platform only proves itself once a second supplier is live.
3. A catalogue carpenters discover from: product knowledge, documents, and the search/agent chat.

**Public promise (2026-10-03).** Marketing describes an assistant ("הסוכן של נגרים B2B") and has
announced **voice ordering in under a minute** as coming ("בהמשך"). Safe to advertise as live
today, and nothing more:
- A Hebrew chat/search assistant that finds a product, shows the supplier price excl. VAT and adds it to the cart.
- Purchase orders sent straight to the supplier, who confirms, delivers and invoices.
- B2B prices excl. VAT, shown after free registration.
- Reorder ("מה הזמנתי בפעם שעברה").
- A catalogue that today is mostly adhesives and finishing.

Supplier comparison exists on the product page but stays dormant until a second supplier is live.
The agent is **keyword matching, not an LLM**, so don't call it AI in copy or UI. Everything
promised but not built is tracked as a `promise-gap` task (see §7). Move a capability into the
list above only after it passes `nagarim-smoke-test` on staging.

The 10-week roadmap (`docs/workplan.html`, rev 2, 06.09) holds the evidence behind this: an
introduction message about an unfamiliar product beat a discount on every metric, so the platform
earns its place through **catalogue discovery, basket size, measurement, and saving manual order
intake**, not through price comparison. `TODO.md` is the live backlog; `HANDOFF.md` lists
cross-machine handover tasks while it exists.

**Owner & repos:** one person. Git author "Itamir", GitHub **hagaimukmel-del**. This project lives
only in `hagaimukmel-del/marketplace-negrim` (public). The owner's Telegram bot (GLUE-BOT, another
account) is a **separate, unrelated project**. Don't reference it here or mix code between them.

**Working across machines:** the owner works on a work PC and a home PC. Always `git pull` first.
The env files (`.env.local` → staging, `.env.staging.local`, `.env.prod.local`) exist **only on the
work PC**. Without them there is no dev server, migration or smoke test; say so and stop instead of
working around it. The live site doesn't depend on either PC: **Vercel deploys every push to `main`**.

**Language:** talk to the owner in Hebrew. Code, comments and commits stay in English.

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
- **Type Safety**: Run `npm run db:types` after a migration reaches production (it regenerates `src/lib/database.types.ts` from the production project). See the `nagarim-migrations` skill.

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
- **Two databases (since 2026-09-16).** Production `marketplace-negrim` (ihburmhtcfhwlairyfyf) and
  staging `marketplace-negrim-staging` (dyueyfmuhwvpgocbypqz). Local `.env.local` points at
  STAGING; the production copy is `.env.prod.local` (Next never loads it). Test on staging, never on
  production rows. Every migration goes to both: `npm run db:push:staging` first, then
  `npm run db:push` (production, the linked project). Staging sets `NEXT_PUBLIC_ENV_LABEL` (yellow
  strip) and `EMAIL_REDIRECT_ALL=true` (all mail to the test inbox).
- **Amounts are snapshots.** Store `unit_price` at time of order and never recompute from the
  current price. The supplier's confirmed amount — not the submitted amount — is the basis for
  any commission calculation.
- **Revenue model**: commission billed to the supplier (`supplier_commission`, `commission_rate`
  stored as snapshots on the supplier order) and/or supplier subscription. Not a cut of payment.

## 6. Current State vs Target — read before assuming
Last verified 2026-10-03 by running the checks, not from memory. Re-verify before trusting it.

| Rule says | Actually in the repo now |
|---|---|
| `@supabase/ssr`, server clients | Still only `@supabase/supabase-js`. Two clients: `lib/supabase.ts` (browser, public key, catalogue reads only) and `lib/supabase-admin.ts` (service role, `server-only`, everything else) |
| Server Components first | 61 of 198 files under `src/` are `'use client'`. `/admin/*` and `/o/[token]` are Server Components that hand data to a client island; the carpenter app (`/app/*`) is largely client-rendered |
| Zod + Server Actions | `zod` is still not a declared dependency. Mutations go through `/api/*` route handlers with hand-written validation |
| Shadcn/ui + Radix + Lucide | **Lucide is in.** No shadcn/Radix and no `components.json`; components are hand-written Tailwind on the tokens in `globals.css` |
| Migrations in `supabase/migrations/` | **Done.** 35 migrations, CLI linked to production, staging via `npm run db:push:staging`. Never edit schema in the dashboard |
| `supabase gen types typescript` | **Done.** `npm run db:types` regenerates `src/lib/database.types.ts`; hand-written aliases live in `lib/db.ts` so they survive regeneration |
| No `any` | `npx eslint src`: 29 errors, 19 warnings, mostly `no-explicit-any` (many in the chat/agent files). Treat lint-clean as "no new errors" |
| `npm run type-check` / `build` clean | `tsc --noEmit` passes. Every Vercel deploy from 28.09 to 03.10 failed on tsc errors, so run it before pushing |
| No test suite | `npm test` is a stub. Verification = `type-check` + `build` + the `nagarim-smoke-test` skill on staging |

**Resolved since this file was written — do not re-report these:**
- `orders.items_json` is gone. Orders are `orders` → `order_items` with `unit_price_excl_vat`
  and `product_name_he` snapshotted at order time (migration 0004).
- The mock supplier area and its `DEMO_SUPPLIERS` / localStorage login are deleted, along with
  the unused `Navbar` and `AdminNavbar` (which linked to seven routes that never existed).
- `/admin/*` exists: results, orders, campaigns, carpenters, login. Gated by ADMIN_PASSWORD +
  ADMIN_SECRET, verified in a Server Component and re-checked in every admin route handler.
- VAT lives in `lib/vat.ts` and is snapshotted onto each order as `orders.vat_rate`.
- Only one profile table matters (`user_profiles`); `profiles` is legacy and unused.
- **One checkout splits into one purchase order per supplier** (migration
  `20260917120000_split_orders_by_supplier`): `orders.supplier_id` + a shared `checkout_id`.
- **Suppliers and carpenters are emailed** through Resend (`lib/email.ts`, `lib/notify-order.ts`)
  from `orders@nagarimb2b.com`, with a signed "confirm order" link. Test businesses (name contains
  "ניסיון") and all mail on staging go to the test inbox.
- The Stripe/PayPal routes and the abandoned `ProtectedRoute` / `GatedPriceGuard` are deleted.
- Suppliers have their own console (`/supplier`, token link + cookie session) with price-list
  import and undo (`import_batches`), documents, and order confirmation.

**Features added since 09.09 — know they exist before building something similar:**
- **המציאון** (`/app/metzion`, `lib/metzion.ts`): carpenter-to-carpenter listings; the deal
  happens directly between carpenters, the platform only connects them (spec in `TODO.md`).
- **Agent chat** (`components/chat`, `lib/procurement-agent.ts`, `/api/carpenter/search`): a
  Hebrew search assistant. **No LLM.** Intent parsing is keyword matching (see its `TODO`).
  "פנה לספק" writes `supplier_contact_requests` (migration not applied yet, see `HANDOFF.md`)
  and does not email the supplier.
- Product knowledge and documents (`product_specifications`, supplier/product documents in
  Supabase Storage), a 10-category tree (`category_groups`), regions (`lib/regions.ts`), terms
  acceptance (`/terms`, `TermsGate`).
- Dev-only routes `/api/demo/seed-agent` and `/api/debug/check-data` refuse to run when
  `NODE_ENV=production`. Keep it that way.

**The catalogue's shape (migration 0011/0012, 2026-09-10) — read this before touching prices:**
- `products` is the **canonical product**: what the item is. Name, brand, `mpn` (manufacturer
  part number), `base_unit`, `attributes`, image, category. It has **no price and no supplier**.
- `supplier_offers` is **what one supplier charges**: `price_excl_vat`, `stock_qty`,
  `supplier_sku`, `pack_label` + `pack_qty`, `min_order_qty`, `lead_time_days`. One row per
  (product, supplier).
- **Prices are always per base unit**, and `base_unit` is a closed five-value vocabulary
  (`unit`/`kg`/`liter`/`meter`/`sqm`) owned by the platform, never by suppliers. That is what
  makes a carton of 25 comparable with a sleeve of 6. Do not turn it into free text.
- Every read goes through `src/lib/catalog.ts`. `bestOffer()` is the one place that decides
  which offer a carpenter sees (in stock first, then cheapest). Do not re-implement it.
- A product with no live offer is not in the catalogue — the `!inner` join enforces it. Nobody
  sells it, so there is no price to show.
- `order_items.supplier_id` is stamped at order time, and one cart is split into one purchase
  order per supplier (see above).
- Matching a supplier's row to a canonical product: `brand` + `mpn` where they exist, otherwise
  a suggestion a human confirms. The sheet sync matches on the Hebrew **and** English name pair,
  and that is deliberate — the sheet lists `קלינר Q1924 ניקוי EVA` twice, at 1,200 and 89, and
  only the English name separates them.

**Standing facts that look like gaps but aren't bugs:**
- The operator is not emailed per order, by design (`ADMIN_EMAIL` is only for new supplier
  applications). Orders are watched in `/admin/orders`.
- `supplier_offers.stock_qty` is a placeholder (100) on synced rows. Never display it as real stock.
- About 80 emoji remain in UI/agent strings. Don't add new ones.

Open gaps, unfinished work and planned features live in `docs/tasks/` (see §7), not here.

**Security model, so it is not re-derived each time:**
- The public key is read-only and reaches only `products`, `categories`, `volume_pricing`.
- `carpenters`, `orders`, `order_items`, `campaigns`, `order_intents`, `offer_events` and
  `suppliers` have RLS on and no policy: reachable only through server code holding the service
  role. `suppliers` being closed is why the browser cannot read a supplier's name — an embed of
  it returns undefined rather than failing, so keep supplier names to server components.
- `supplier_offers` had a public SELECT policy. Migration `20260914130000_lock_prices` drops it:
  the catalogue is rendered on the server, which decides per visitor whether prices are shown,
  and the table is service-role only like `orders`. Before assuming prices are public or locked
  on a given database, check that this migration is applied there.
- A carpenter is identified by the token in `/o/[token]`, remembered in localStorage for the
  visit. Every server use re-resolves it against the database; nothing trusts a client-supplied
  id. Order reads are scoped to the owning carpenter.
- `/api/join` is the only public endpoint that writes. It dedupes on the last 9 phone digits, so
  repeated submissions return the same link instead of creating rows.

## 7. On-demand context: product map, tasks, skills
Read these only when the task needs them. They are deliberately **not** imported here.
- `docs/product-map/README.md`: every product area (routes, code, tables, rules, status), one file per area.
- `docs/tasks/README.md`: gaps, unfinished work, decisions and planned features, one `T-###.md` each, with an index.

Project skills (`.claude/skills/`):
- **product-map** — read/maintain the map and tasks; update them in the same commit as the code.
- **nagarim-migrations** — any DB change: staging first (`db:push:staging`), production only on an explicit yes, then `db:types`.
- **catalog-import** — supplier price lists and the `דבקים` sheet sync. Bundles `scripts/normalize_pricelist.py`.
- **nagarim-smoke-test** — click-through of carpenter → order → supplier → admin in the built-in browser, staging only.
