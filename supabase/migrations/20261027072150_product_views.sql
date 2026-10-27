-- How often each product page is opened, for "הכי נצפים" in the catalogue.
--
-- One counter row per product, not a row per view: the catalogue only needs to
-- rank products, and a counter stays tiny. Kept out of `products` so a view
-- never touches the canonical product row or its updated_at.
--
-- Written from the server only (the product page, after it renders, never for
-- the operator). RLS on, no policy; the bump function is executable by the
-- service role alone, so the public key can neither read nor inflate it.
--
-- Additive only. The app reads it on its own and treats a missing table as
-- "no views yet", so code can ship before this migration is applied.

create table if not exists public.product_view_counts (
  product_id     uuid primary key references public.products (id) on delete cascade,
  views          integer not null default 0,
  last_viewed_at timestamptz not null default now()
);

alter table public.product_view_counts enable row level security;

create or replace function public.bump_product_view(p_product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.product_view_counts (product_id, views, last_viewed_at)
  values (p_product_id, 1, now())
  on conflict (product_id) do update
    set views = public.product_view_counts.views + 1,
        last_viewed_at = now();
$$;

revoke all on function public.bump_product_view(uuid) from public, anon, authenticated;
grant execute on function public.bump_product_view(uuid) to service_role;
