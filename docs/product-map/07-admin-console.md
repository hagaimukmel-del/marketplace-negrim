# 7 · Admin console (`/admin`)
Verified: 2026-10-08

## Purpose
The operator's (owner's) back office: approve suppliers, manage the catalogue, watch orders and
carpenters, run campaigns and raffles, moderate the Metzion, read reports.

## Entry points
| Route | What |
|---|---|
| `/admin/login` → `/api/admin/login` | One shared passphrase (`ADMIN_PASSWORD` + `ADMIN_SECRET`), throttled (`admin_login_attempts`) |
| `/admin` | Dashboard |
| `/admin/orders`, `/suppliers`, `/carpenters`, `/products`, `/categories` | Core management |
| `/admin/campaigns`, `/api/admin/raffle` | Campaigns and raffle draws (area 9) |
| `/admin/metzion` | Listing moderation and reports |
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
- A self-run supplier's order lines are not sent to `/admin/orders` until the operator clicks
  "הצג שורות לתמיכה", and his entry token is never sent to the admin pages; the operator can
  mail it to the address on file instead.

## Status
Live.

## Open tasks
T-021
