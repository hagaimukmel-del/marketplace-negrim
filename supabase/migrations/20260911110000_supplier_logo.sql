-- A supplier's logo.
--
-- It earns its place in exactly two spots: the cart once it splits by supplier
-- ("you are buying from these three"), and a product carried by several
-- suppliers, where a logo is scanned faster than a company name. It is not for
-- the catalogue list, where thirty of them would be noise.
--
-- Files live in the `supplier-logos` storage bucket, public read, 2MB cap,
-- images only - the same arrangement as product images, which already works.

alter table public.suppliers
  add column if not exists logo_url text;

comment on column public.suppliers.logo_url is
  'Public URL in the supplier-logos bucket. Null is normal and the UI falls back to initials - most suppliers will never upload one.';
