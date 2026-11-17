-- What carpentries and visitors search for (product review 2026-11-12, PR 4:
-- measurement). One row per search in the catalogue: the words, how many
-- products matched, and which suppliers' products were among them, so a
-- supplier can be shown "you appeared in N searches" and the operator sees
-- what people look for and find nothing (the next supplier to bring).
--
-- Holds no visitor identity: carpenter_id only for a registered carpentry,
-- nothing for a visitor. Written from the server only (the catalogue page,
-- after it renders; never for the operator, a supplier or a link prefetch).
-- RLS on, no policy: service role only.
--
-- Additive only. The app treats a missing table as "not logged", so code can
-- ship before this migration is applied.

create table if not exists public.search_queries (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  query         text not null check (char_length(query) between 1 and 120),
  results       integer not null default 0,
  supplier_ids  uuid[] not null default '{}',
  carpenter_id  uuid references public.carpenters (id) on delete set null
);

create index if not exists search_queries_created_idx on public.search_queries (created_at desc);
create index if not exists search_queries_suppliers_idx on public.search_queries using gin (supplier_ids);

alter table public.search_queries enable row level security;

-- Product views by day (owner, 2026-11-17: "החשיפה שלך" counts 30 days and a
-- monthly chart below it). product_view_counts keeps the running total the
-- catalogue ranks by; this adds one row per product and day, so a supplier's
-- product views can be counted per period like everything else. Counting by
-- day starts when this migration is applied.

create table if not exists public.product_view_days (
  product_id uuid not null references public.products (id) on delete cascade,
  day        date not null default (now() at time zone 'Asia/Jerusalem')::date,
  views      integer not null default 0,
  primary key (product_id, day)
);

create index if not exists product_view_days_day_idx on public.product_view_days (day);

alter table public.product_view_days enable row level security;

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
  insert into public.product_view_days (product_id, day, views)
  values (p_product_id, (now() at time zone 'Asia/Jerusalem')::date, 1)
  on conflict (product_id, day) do update
    set views = public.product_view_days.views + 1;
$$;

revoke all on function public.bump_product_view(uuid) from public, anon, authenticated;
grant execute on function public.bump_product_view(uuid) to service_role;
