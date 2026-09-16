-- A price-list import, remembered well enough to be undone.
--
-- A supplier uploading a spreadsheet can change hundreds of prices in one tap.
-- If the columns were mapped wrong, "undo" has to put every one of them back —
-- so each import stores what it changed and what each value was before.

create table if not exists public.import_batches (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  created_by  text not null check (created_by in ('supplier', 'admin')),
  file_name   text,
  -- counts per action, for the history list
  summary     jsonb not null default '{}'::jsonb,
  -- [{ type: 'update', offer_id, before: {...} } | { type: 'create_offer', offer_id }
  --  | { type: 'create_product', product_id }]
  changes     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  undone_at   timestamptz
);

create index if not exists import_batches_supplier_idx on public.import_batches (supplier_id, created_at desc);

alter table public.import_batches enable row level security;
