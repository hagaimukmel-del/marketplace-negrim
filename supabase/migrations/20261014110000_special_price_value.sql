-- The special price itself (owner, 14.10.2026). Stage 1 let a supplier say
-- from what quantity a carpentry may ask for a special price
-- (20261012090000_quote_rules); this adds the price.
--
-- Additive only: one column and a check. No RLS change; supplier_offers stays
-- service-role only.
--
-- supplier_offers.special_price_excl_vat: the unit price excl. VAT, per base
--   unit like price_excl_vat, from special_price_min_qty up. Null = the
--   supplier answers each special-price request itself. With a price, a
--   carpentry's request that reaches the threshold is answered at once with
--   it, as an ordinary quote the carpentry then accepts (src/lib/quote-rules.ts,
--   /api/carpenter/quotes). It never changes a cart price by itself: there are
--   still no automatic quantity tiers.

alter table public.supplier_offers
  add column if not exists special_price_excl_vat numeric(12, 2);

alter table public.supplier_offers drop constraint if exists supplier_offers_special_price_excl_vat;
alter table public.supplier_offers
  add constraint supplier_offers_special_price_excl_vat
  check (special_price_excl_vat is null or special_price_excl_vat > 0);
