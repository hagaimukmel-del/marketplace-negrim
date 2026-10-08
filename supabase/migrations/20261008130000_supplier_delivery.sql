-- Where a supplier delivers (T-026, owner 2026-10-08: delivery area is required).
--
-- delivery_regions holds keys from src/lib/regions.ts (seven regions, closed
-- vocabulary, owned by the platform like base_unit). Empty means "not set yet":
-- the app treats such a supplier as unknown rather than "does not deliver", so
-- existing suppliers keep showing as before until they fill it in. The supplier
-- console asks for it and refuses to save an empty list.
--
-- delivery_fee_excl_vat / free_delivery_from_excl_vat are optional and shown to
-- carpenters as the supplier's own terms; the platform never charges them.
--
-- Read by src/lib/delivery.ts, which tolerates the columns being absent so the
-- app keeps working on a database this migration has not reached yet.

alter table public.suppliers
  add column if not exists delivery_regions text[] not null default '{}',
  add column if not exists delivery_fee_excl_vat numeric(10, 2),
  add column if not exists free_delivery_from_excl_vat numeric(10, 2);

alter table public.suppliers drop constraint if exists suppliers_delivery_regions_known;
alter table public.suppliers
  add constraint suppliers_delivery_regions_known
  check (delivery_regions <@ array['north', 'haifa', 'sharon', 'center', 'shfela', 'jerusalem', 'south']::text[]);

alter table public.suppliers drop constraint if exists suppliers_delivery_fees_nonnegative;
alter table public.suppliers
  add constraint suppliers_delivery_fees_nonnegative
  check (coalesce(delivery_fee_excl_vat, 0) >= 0 and coalesce(free_delivery_from_excl_vat, 0) >= 0);
