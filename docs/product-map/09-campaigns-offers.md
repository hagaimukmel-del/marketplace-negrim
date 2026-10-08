# 9 · Campaigns, offer pages, raffle
Verified: 2026-10-08

## Purpose
The original growth engine (roadmap `docs/workplan.html`): the operator sends a carpenter a
personal offer, the carpenter opens their `/o/[token]` page, and their views and intents are
measured. A raffle among carpenters is the engagement tool.

## Entry points
| Route | What |
|---|---|
| `/o/[token]` | Personal offer / entry page (`lib/offer.ts`, `loadOfferPage`) |
| `POST /api/offer/event`, `POST /api/offer/intent` | Measurement: page events and order intents |
| `/admin/campaigns` (`/api/admin/campaigns`) | Build and track campaigns |
| `/api/admin/raffle` | Draw a winner with a cryptographic random pick; every draw is recorded |

## Code
`lib/offer.ts`, `src/app/o/[token]/`, `lib/emails/raffle-win.ts`.

## Data
`campaigns`, `offer_events`, `order_intents`, `raffle_draws`, `carpenters`.

## Rules & invariants
- Measurement is the point: "who received, who opened, who almost ordered" (workplan "מדידה").
- The roadmap's finding: an introduction to an unfamiliar product beats a discount. Don't build discount mechanics as a growth tool without new evidence.

## Status
Live; older than the `/app` purchasing app. Check how much of it is still used before extending it.

## Open tasks
T-024
