# 4 · Orders & fulfilment
Verified: 2026-10-03

## Purpose
Turn a cart into purchase orders (הזמנות רכש), one per supplier, get each supplier to confirm,
and keep the carpenter informed. The marketplace never takes payment.

## Entry points
| Route | What |
|---|---|
| `POST /api/orders`, `/api/orders/[id]` | Create / read orders (checkout) |
| `/supplier/confirm/[token]` → `POST /api/supplier/confirm` | Signed one-purpose link in the email; the supplier confirms without an account |
| `/supplier` → Orders tab (`/api/supplier/orders`) | Supplier sees and updates their orders |
| `/admin/orders` (`/api/admin/orders/[id]`) | Operator view and override |
| `/app/orders/[id]` | Carpenter tracking |

## Code
`lib/notify-order.ts`, `lib/emails/new-order.ts`, `lib/emails/carpenter.ts`,
`lib/supplier-confirm.ts`, `lib/supplier-link.ts`, `lib/order-status.ts`, `lib/vat.ts`.

## Data
`orders` (`supplier_id`, `checkout_id`, `vat_rate`, commission snapshots), `order_items`
(`unit_price_excl_vat`, `product_name_he`, `supplier_id`), `returns`, `reviews` (verify use).

## Rules & invariants
CLAUDE.md §5 is binding. In short:
- The supplier is the seller of record. Checkout ends at "order sent".
- Status reflects fulfilment, never payment (`lib/order-status.ts` is the one vocabulary).
- Amounts are snapshots. Commission is based on the supplier's **confirmed** amount.
- One checkout becomes one order per supplier, sharing a `checkout_id`.
- Email safety valves: names containing "ניסיון" and all of staging go to the test inbox.

## Status
Live. The operator gets no per-order email, by design.

## Open tasks
T-012
