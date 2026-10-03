# Product map — Marketplace Negrim

What the site does, area by area, and where each part lives in the code. Written for AI agents
and for the owner. **Read on demand:** open this index, then only the area file your task
touches. Don't import these files into CLAUDE.md or memory with `@`. They are reference, not
standing context.

Last verified against the code: **2026-10-03**.

## Areas

| # | Area | File | Who uses it | State |
|---|---|---|---|---|
| 1 | Public site & onboarding | [01-public-onboarding.md](01-public-onboarding.md) | visitors, new carpenters/suppliers | live |
| 2 | Carpenter purchasing app (`/app`) | [02-carpenter-app.md](02-carpenter-app.md) | carpenters | live |
| 3 | Agent chat (search assistant) | [03-agent-chat.md](03-agent-chat.md) | carpenters | partial |
| 4 | Orders & fulfilment | [04-orders-fulfilment.md](04-orders-fulfilment.md) | carpenters, suppliers, operator | live |
| 5 | Catalogue & pricing | [05-catalogue-pricing.md](05-catalogue-pricing.md) | everyone (data) | live, thin |
| 6 | Supplier console (`/supplier`) | [06-supplier-console.md](06-supplier-console.md) | suppliers | live |
| 7 | Admin console (`/admin`) | [07-admin-console.md](07-admin-console.md) | operator (owner) | live |
| 8 | המציאון (`/app/metzion`) | [08-metzion.md](08-metzion.md) | carpenters | live |
| 9 | Campaigns, offer pages, raffle | [09-campaigns-offers.md](09-campaigns-offers.md) | operator → carpenters | live, older |
| 10 | Platform: auth, email, data, envs | [10-platform.md](10-platform.md) | developers | live |

**State** = `live` (works and is reachable) · `partial` (reachable, some promised behaviour
missing) · `dormant` (built but not exercised, e.g. waits for a second supplier) · `legacy`
(reachable but superseded).

## Format of an area file

Every area file uses the same headings, so an agent can jump straight to what it needs:

1. **Purpose**: one or two sentences, in product terms.
2. **Entry points**: pages (routes) and API routes.
3. **Code**: the lib/components files that own the logic.
4. **Data**: tables it reads/writes.
5. **Rules & invariants**: what must stay true (link to CLAUDE.md sections instead of copying them).
6. **Status**: what's live, partial, dormant.
7. **Open tasks**: task IDs from [`docs/tasks/`](../tasks/README.md), by ID only.

## Keeping it true

- When a change adds, removes or moves a route, table or feature, update that area file in
  the same commit and bump its `Verified` date.
- When a task closes, remove its ID from the area's **Open tasks** and move the behaviour into
  **Status**.
- Claims here are about the code. Facts about the business (suppliers, goals) belong in
  CLAUDE.md §0 and §5.
