# 7 · Admin console (`/admin`)
Verified: 2026-10-03

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
| `/admin/view/carpenter`, `/admin/view/supplier` | See the real app as a given carpenter or supplier |
| `/api/admin/email-test` | Send a test email |

## Code
`src/app/admin/(guarded)/**` (Server Components gate, client islands), `lib/admin-auth.ts`,
`lib/login-throttle.ts`, `SyncButton.tsx`.

## Data
Everything, through the service role.

## Rules & invariants
- The gate is checked in the guarded layout **and** again in every admin route handler.
- Fails closed when `ADMIN_PASSWORD` / `ADMIN_SECRET` are missing.

## Status
Live.

## Open tasks
(none specific)
