-- A supplier may list a product without a price (owner, 2026-11-18).
--
-- Until now supplier_offers.price_excl_vat was required, and suppliers who did
-- not want to publish a price typed 1 ₪ to get past the form. That fake price
-- then showed to carpenters and decided which offer was "cheapest".
--
-- Null now means "price on request" for that one offer. It is the per-offer
-- twin of suppliers.price_mode = 'quote' (T-023, migration 20261011140000) and
-- every reader treats it the same way (src/lib/catalog.ts isQuoteOffer): no
-- price is shown, the offer never leads on price, a carpenter asks for a quote
-- from the product page, and /api/orders refuses to order it without an
-- answered quote. A price that is set is still per base unit and above zero.
--
-- Booking "מוצר השבוע" needs nothing new: promo_weeks.show_price already
-- defaults to false, and a card for an offer without a price shows none.
--
-- Safe before the code that writes nulls is deployed: it only relaxes a
-- constraint, and no existing row changes.

alter table public.supplier_offers
  alter column price_excl_vat drop not null;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_price_excl_vat_check;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_price_excl_vat;

alter table public.supplier_offers
  add constraint supplier_offers_price_excl_vat
  check (price_excl_vat is null or price_excl_vat > 0);
