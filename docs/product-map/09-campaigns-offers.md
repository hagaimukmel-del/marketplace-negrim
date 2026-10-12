# 9 · Campaigns, offer pages, raffle
Verified: 2026-10-11

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
| `/admin/promotions` (`/api/admin/promo`) | "מוצר השבוע": approve or reject a supplier's weekly booking, see each week's results |
| `POST /api/promo/event` | Counts a view or add-to-cart on the promoted card, for the week running now only |
| `/api/admin/raffle` | Draw a winner with a cryptographic random pick; every draw is recorded |

## Code
`lib/offer.ts`, `src/app/o/[token]/`, `lib/emails/raffle-win.ts`.

## Data
`promo_weeks`, `promo_events`, `campaigns`, `offer_events`, `order_intents`, `raffle_draws`, `carpenters`.

## Rules & invariants
- Measurement is the point: "who received, who opened, who almost ordered" (workplan "מדידה").
- "מוצר השבוע" (T-024, `lib/promo.ts`): one approved booking per week (partial unique index),
  690 ₪ excl. VAT snapshotted, billed outside the site. Always labelled with a small "פרסומת"
  (owner, 2026-10-11). The card shows no price unless the supplier ticked "להציג את המחיר שלי
  בפרסומת" (`promo_weeks.show_price`, migration 20261011150000, toggled per booking in the
  supplier's promo tab); the agent still lists the price, since there it answers a search. It
  sells from the booking supplier's own offer and is hidden when that offer is no longer live.
  Shown at the top of `/app`, at the top of its category, and first in the agent when the search
  lands in its main category.
- The roadmap's finding: an introduction to an unfamiliar product beats a discount. Don't build discount mechanics as a growth tool without new evidence.

## Status
Live; older than the `/app` purchasing app. Check how much of it is still used before extending it.

## Open tasks
T-024
