-- Lock the product-knowledge tables to the service role.
--
-- product_documents (20260927100000) was created without RLS, so the public
-- key could read, insert and delete rows. product_specifications and
-- supplier_documents_products (20260924100000) had insert/delete policies
-- gated on "admin_login_attempts has any row", which is true for everyone
-- once one login was ever recorded.
--
-- Every write goes through /api/admin/* with getSupabaseAdmin(), and every
-- read through server code, so the service role is all the app needs. The
-- write policies are set to false rather than dropped (same effect, and the
-- names stay for anyone reading pg_policies). The read policies stay: specs
-- are product facts, not prices.

alter table public.product_documents enable row level security;

alter policy "admin can insert specs" on public.product_specifications with check (false);
alter policy "admin can delete specs" on public.product_specifications using (false);
alter policy "admin can insert doc-product links" on public.supplier_documents_products with check (false);
alter policy "admin can delete doc-product links" on public.supplier_documents_products using (false);
