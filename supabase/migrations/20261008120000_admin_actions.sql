-- What the operator did inside another business's data, written down.
--
-- The operator also owns the first supplier, so a second supplier will ask what
-- the platform can see and change on their account. The admin console now
-- answers that in code (self-registered suppliers are view-only to the admin),
-- and this log is the proof: opening a supplier's console, revealing the lines
-- of their order for support, merging or hiding their offer.
--
-- Written only by server code with the service role (lib/admin-scope.ts), read
-- only in the admin console. Nothing depends on it; writes are best-effort, so
-- the console keeps working on a database where this file is not applied yet.

create table if not exists public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  supplier_id  uuid references public.suppliers(id) on delete set null,
  target_id    text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_actions_supplier_idx on public.admin_actions (supplier_id, created_at desc);

alter table public.admin_actions enable row level security;

-- T-021: the admin uploads supplier documents with no auth.users row behind it,
-- so the uploader can't be required. Supplier uploads still record theirs.
alter table public.supplier_documents alter column uploaded_by drop not null;
