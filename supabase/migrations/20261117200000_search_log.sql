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
