# 7 · Admin console (`/admin`)
Verified: 2026-10-26

## Purpose
The operator's (owner's) back office: approve suppliers, manage the catalogue, watch orders and
carpenters, run campaigns and raffles, moderate the Metzion, read reports.

## Entry points
| Route | What |
|---|---|
| `/admin/login` → `/api/admin/login` | One shared passphrase (`ADMIN_PASSWORD` + `ADMIN_SECRET`), throttled (`admin_login_attempts`) |
| `/admin` | Dashboard |
| `/admin/promotions` | "מוצר השבוע" bookings: approve, reject with a note shown to the supplier, withdraw a coming week, results per week (T-024). Logged in `admin_actions` |
| `/admin/orders`, `/suppliers`, `/carpenters`, `/products`, `/categories` | Core management |
| `/admin/carpenters` → filter "נמחקו" | Deleted carpentries, kept 3 months: restore in one click, or "מחק סופית" now. `lib/carpenter-deletion.ts` (rules), `lib/carpenter-deletion-server.ts` |
| `/admin/campaigns`, `/api/admin/raffle` | Campaigns and raffle draws (area 9) |
| `/admin/metzion` | Listing moderation and reports |
| `/admin/communication` → `/api/admin/communication` | "בריאות תקשורת" (T-036 step 6): mail sent/arrived/failed this week, failed mail with resend, blocked addresses with unblock, orders and quotes waiting on a supplier with their reminder rung, unanswered carpenter messages, suppliers and carpentries that cannot be reached (no email, bouncing, no mobile). `lib/communication-health.ts` |
| `/admin/reports` | Reports |
| `/admin/view/carpenter`, `/admin/view/supplier` → `/api/admin/view-supplier/[id]` | See the real app as a given carpenter or supplier. The supplier entry token is never rendered; the route sets the session on the server |
| `/api/admin/email-test` | Send a test email |

## Code
`src/app/admin/(guarded)/**` (Server Components gate, client islands), `lib/admin-auth.ts`,
`lib/admin-scope.ts` (what the operator may change per supplier), `lib/login-throttle.ts`, `SyncButton.tsx`.

## Data
Everything, through the service role. `admin_actions` (migration `20261008120000`) logs what the
operator did inside a self-run supplier's account.

## Rules & invariants
- The gate is checked in the guarded layout **and** again in every admin route handler.
- Fails closed when `ADMIN_PASSWORD` / `ADMIN_SECRET` are missing.
- **Self-run vs operator-managed supplier** (owner, 2026-10-08): `suppliers.source = 'self'` (signed
  up via `/supplier/join`) runs his own account; `seed` / `admin` are run by the operator.
  For a self-run supplier the operator can look but not change: every supplier write route,
  the price import (apply/undo), admin product/offer create/delete/edit and order confirm/status
  refuse with 403 (`refuseAdminWriteFor`, `refusedForSelfRun`). Allowed and logged in
  `admin_actions`: hiding/showing an offer, merging duplicate products, opening the console
  (`open_supplier_console`), revealing an order's lines for support (`reveal_order_lines`).
- `/admin/suppliers` shows each supplier's message thread count and how many wait for its answer;
  message content is never shown to the admin. The same list marks a quote-only supplier and
  counts its quote requests and unanswered ones, never the quoted price (T-023). A self-run
  quote-only supplier's prices are not sent to `/admin/products` and stay out of the report
  averages.
- A self-run supplier's order lines are not sent to `/admin/orders` until the operator clicks
  "הצג שורות לתמיכה", and his entry token is never sent to the admin pages; the operator can
  mail it to the address on file instead.

- **Deleting a carpentry is recoverable** (owner, 2026-10-26; migration `20261026100000_carpenter_soft_delete`).
  "מחק" sets `deleted_at`, `deleted_by`, keeps the old `is_active` in `active_before_delete`
  and sets `is_active = false` (a DB check refuses a deleted row that is active), so every
  existing gate already keeps them out: link, login code, Google, `/join`, prices, orders,
  Metzion, work board. Nothing else is touched. Suppliers stop seeing them: pending orders
  (also refused on the email confirm link), quote requests, agent questions, message threads,
  reminders and the morning summary. Orders the supplier already handled stay in its console
  as its own record. A deleted carpentry cannot be unblocked, only restored, and restoring
  brings back the old blocked/active state. The daily cron (`/api/cron/outbox`) removes rows
  deleted more than 3 calendar months ago; that cascades like the old hard delete, past
  orders keep their snapshot with `carpenter_id` cleared. Delete, restore and purge are
  logged in `admin_actions`. Storage files (Metzion images, work files) are not swept by the purge.

## Status
Live.

## Open tasks
T-021
