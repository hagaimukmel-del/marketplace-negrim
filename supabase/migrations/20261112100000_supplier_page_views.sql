-- How often each supplier's page is opened, per day, so the operator can show
-- a supplier what its subscription brings (product review 2026-11-12).
--
-- One counter row per supplier per day, not a row per view: enough for "how
-- many times this month", and it stays tiny. Never a row per visitor, so it
-- holds nothing about who looked.
--
-- Written from the server only (the supplier page, after it renders; never
-- for the operator, the supplier itself or a link prefetch). RLS on, no
-- policy; the bump function is executable by the service role alone, so the
-- public key can neither read nor inflate it.
--
-- Additive only. The app treats a missing table or function as "not counted",
-- so code can ship before this migration is applied.

create table if not exists public.supplier_page_views (
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  day         date not null,
  views       integer not null default 0,
  primary key (supplier_id, day)
);

alter table public.supplier_page_views enable row level security;

create or replace function public.bump_supplier_view(p_supplier_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.supplier_page_views (supplier_id, day, views)
  values (p_supplier_id, (now() at time zone 'Asia/Jerusalem')::date, 1)
  on conflict (supplier_id, day) do update
    set views = public.supplier_page_views.views + 1;
$$;

revoke all on function public.bump_supplier_view(uuid) from public, anon, authenticated;
grant execute on function public.bump_supplier_view(uuid) to service_role;
