-- products: no longer readable with the public key (owner, 2026-11-08).
--
-- A visitor who has not registered may see the list of categories and nothing
-- else: not a product, not a supplier, not a price. The pages enforce it on the
-- server (src/lib/app/catalog-access.ts), but the policy
-- "catalogue_products_read" (20260906130000_rls_lockdown) still let anyone with
-- the public key list every product name, brand and part number over the REST
-- API. Nothing in the app reads products with the public key any more: the
-- catalogue is read on the server through the service role (lib/app/catalog-server.ts).
--
-- Closed with `using (false)` rather than dropped, the same way
-- 20261005121417_lock_volume_pricing closed volume_pricing. Categories stay
-- readable: they are what a visitor is allowed to see.

alter policy "catalogue_products_read" on public.products using (false);
