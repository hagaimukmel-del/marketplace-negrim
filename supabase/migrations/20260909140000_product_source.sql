-- =============================================================================
-- 0009 · WHERE A PRODUCT CAME FROM
-- =============================================================================
-- The sync retires anything the sheet no longer lists, which is right for a
-- catalogue that lives in the sheet — a product deleted there should disappear
-- here. But it would also switch off every product added by hand in the admin,
-- because the sheet has never heard of it. Adding a product in the UI and
-- having it vanish on the next sync is worse than not being able to add one.
--
-- The retire step is therefore limited to products the sheet actually owns.
-- =============================================================================

alter table public.products
  add column if not exists source varchar not null default 'sheet'
    check (source in ('sheet', 'manual'));

comment on column public.products.source is
  'sheet = imported from the Google Sheet and retired when it drops out of it. '
  'manual = created in /admin/products; the sync never touches it.';

create index if not exists idx_products_source on public.products using btree (source);
