-- Retire the columns that moved to `supplier_offers`, and two never used.
--
-- Run only once the deployed code reads prices from supplier_offers. Left in
-- place they are a second, silently stale answer to "what does this cost" -
-- the exact bug the split exists to prevent.
--
-- Verify before applying:
--   select count(*) from products p
--     where not exists (select 1 from supplier_offers o where o.product_id = p.id);
-- Anything but 0 means a product would lose its price with no offer to replace
-- it. Investigate rather than proceeding.

-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- Left in place they would be a second, silently stale answer to "what does
-- this cost" - the exact bug this migration exists to prevent.

drop index if exists public.products_supplier_sku_key;
drop index if exists public.products_supplier_name_key;

alter table public.products
  drop column if exists base_price_excl_vat,
  drop column if exists stock_qty,
  drop column if exists sku,
  drop column if exists supplier_id,
  drop column if exists source,
  drop column if exists rating,        -- always null; a fake star rating was removed from the UI
  drop column if exists return_rate;   -- always null, never written, never read

