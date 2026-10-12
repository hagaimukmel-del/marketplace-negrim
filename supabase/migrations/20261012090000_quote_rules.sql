-- Quote request rules and the special-price threshold (stage 1 of the
-- 2026-10-12 RFQ plan, approved by the owner the same day).
--
-- Additive only: three columns on existing tables and one partial unique
-- index. Nothing is dropped, renamed or backfilled, and no RLS changes: both
-- tables stay service-role only (RLS on, no policy). The rules themselves live
-- in src/lib/quote-rules.ts; every route reads these columns tolerantly, so
-- code deployed before this migration keeps working.
--
-- supplier_offers.special_price_min_qty: from what quantity, in the product's
--   base unit, a carpentry may ask this supplier for a special price. Null =
--   no special price on this offer. Only for a supplier who shows prices; a
--   quote-only supplier is bound by min_order_qty alone.
-- supplier_offers.special_price_pack_qty: the pack size the supplier saw when
--   setting the threshold (null = no pack). The supplier enters the threshold
--   in packs ("4 × מיכל 10 ק״ג") and it is stored as base units (40). If
--   pack_qty later changes (console, price list import, sheet sync), the
--   threshold is not reinterpreted: while the two differ it is out of use and
--   the supplier is asked to confirm it again.
--
-- quote_requests.kind: 'quote' (the supplier shows no prices) or 'volume' (a
--   special price for quantity). Left null on existing rows on purpose: what a
--   request was cannot be recovered from the supplier's price mode today.
-- quote_requests.client_request_id: idempotency key the browser generates when
--   the request form opens. A repeated send with the same key returns the
--   request already saved when the details match, and a conflict when they do
--   not. Separate requests for the same product (another quantity) carry
--   another key and are never blocked. Null on existing rows, so the unique
--   index below cannot fail on history.

alter table public.supplier_offers
  add column if not exists special_price_min_qty numeric(12, 3),
  add column if not exists special_price_pack_qty numeric(12, 3);

alter table public.supplier_offers drop constraint if exists supplier_offers_special_price_min_qty;
alter table public.supplier_offers
  add constraint supplier_offers_special_price_min_qty
  check (special_price_min_qty is null or special_price_min_qty > 0);

alter table public.quote_requests
  add column if not exists kind text,
  add column if not exists client_request_id uuid;

alter table public.quote_requests drop constraint if exists quote_requests_kind;
alter table public.quote_requests
  add constraint quote_requests_kind check (kind is null or kind in ('quote', 'volume'));

create unique index if not exists quote_requests_client_request
  on public.quote_requests (carpenter_id, client_request_id)
  where client_request_id is not null;
