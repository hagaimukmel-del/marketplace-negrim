-- A supplier deleting a product, with one click to undo it.
--
-- Until now "הסר" in the supplier console removed the supplier_offers row for
-- good (and the product too, when this supplier created it and nobody else
-- sold it). A slip of the finger lost the price, pack, catalogue number and
-- special price. Now the delete only marks the offer and switches it off; the
-- console lists it under "נמחקו" with a restore button and a "delete for good".
--
--   deleted_at            when the supplier deleted it; null = not deleted
--   active_before_delete  is_active at that moment, so restoring an offer the
--                         supplier had hidden brings it back hidden
--
-- A deleted offer is also is_active = false, so every catalogue, cart, order
-- and quote read that already skips a hidden offer skips a deleted one too.
-- No check constraint ties the two: a price-list import that lists the product
-- again switches it on and clears the mark in a second write.
--
-- Additive. Code reading these columns tolerates them being absent.

alter table public.supplier_offers add column if not exists deleted_at timestamptz;
alter table public.supplier_offers add column if not exists active_before_delete boolean;

create index if not exists supplier_offers_deleted_idx
  on public.supplier_offers (supplier_id) where deleted_at is not null;
