-- A one-time code a supplier types to sign a device in.
--
-- The same reason as login_codes (20261020130000) for carpentries: the emailed
-- entry link signs in whichever browser opens it, and on a phone that is often
-- the mail app's own browser. The supplier login email now also carries a
-- six-digit code, typed on /supplier/join, which signs in that page.
--
-- A table of its own rather than a nullable column on login_codes, so the
-- carpenter flow and its constraints stay exactly as they are. Same rules:
-- only an HMAC of the code is stored, it expires, works once and counts wrong
-- attempts. Read and written only by /api/supplier/login-link and
-- /api/supplier/login-code (lib/login-code.ts).
--
-- Until this is applied, the login email goes out with the link alone (the
-- code cannot be stored), so deploying the code first breaks nothing.

create table if not exists public.supplier_login_codes (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  code_hash     text not null,
  attempts      integer not null default 0,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists supplier_login_codes_supplier_idx on public.supplier_login_codes (supplier_id, created_at desc);

-- Server-only, like suppliers itself: no policy, reached with the service role.
alter table public.supplier_login_codes enable row level security;
