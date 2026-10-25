-- Whether the "מוצר השבוע" card shows the supplier's price (owner, 2026-10-11).
--
-- The supplier decides per booking: by default the ad shows the product
-- without a price, and the price appears only when the supplier asked for it.
-- The price itself always comes from supplier_offers at render time; this is
-- only a display choice. Existing bookings get false.
--
-- Read by src/lib/promo.ts, which falls back to "no price" on a database this
-- migration has not reached yet.

alter table public.promo_weeks
  add column if not exists show_price boolean not null default false;
