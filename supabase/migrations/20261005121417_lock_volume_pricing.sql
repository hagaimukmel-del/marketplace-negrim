-- volume_pricing holds quantity-tier prices (unit_price_excl_vat). The policy
-- "catalogue_volume_pricing_read" (20260906130000_rls_lockdown) let anyone with
-- the public key read it, written when the offer page read tiers from the
-- browser. Since 20260914130000_lock_prices, supplier prices are shown only to
-- signed-in carpenters and the table's one reader is lib/offer.ts, through the
-- service role. The table is empty today; closing the policy keeps the first
-- tier anyone adds from being public. Service-role only, like supplier_offers.
-- Closed with `using (false)` rather than dropped, the same way
-- 20261005090000 closed the product-knowledge write policies.

alter policy "catalogue_volume_pricing_read" on public.volume_pricing using (false);
