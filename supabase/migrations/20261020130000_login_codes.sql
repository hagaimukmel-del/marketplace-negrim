-- A one-time code a carpentry types to sign a device in.
--
-- The emailed login link signs in whichever browser opens it, and on a phone
-- that is often the mail app's own browser rather than the one the carpenter
-- was using. The same email now also carries a six-digit code: typed on the
-- page that asked for it, it signs in that page.
--
-- Six digits can be guessed, so a code lives here rather than being derived
-- from a secret: it expires, it is used once, and it counts wrong attempts.
-- Only an HMAC of the code is stored. Read and written only by
-- /api/carpenter/login-link and /api/carpenter/login-code (lib/login-code.ts).

create table if not exists public.login_codes (
  id            uuid primary key default gen_random_uuid(),
  carpenter_id  uuid not null references public.carpenters(id) on delete cascade,
  code_hash     text not null,
  attempts      integer not null default 0,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists login_codes_carpenter_idx on public.login_codes (carpenter_id, created_at desc);

-- Server-only, like carpenters itself: no policy, reached with the service role.
alter table public.login_codes enable row level security;
