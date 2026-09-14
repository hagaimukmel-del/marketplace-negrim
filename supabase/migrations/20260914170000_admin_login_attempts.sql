-- Slow down guessing at the operator password.
--
-- /admin is one shared passphrase, and until now it could be tried without
-- limit: eight wrong guesses in a row all came back 401 and the ninth was just
-- as welcome. A passphrase with nothing rate-limiting it is only as strong as
-- how fast somebody can ask.
--
-- Attempts are recorded here rather than in memory because the site runs as
-- serverless functions: each instance has its own memory, so an in-process
-- counter would reset every time a new one started — which is exactly when an
-- attacker's requests would land.

create table if not exists public.admin_login_attempts (
  id           uuid primary key default gen_random_uuid(),
  ip           text not null,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);

-- The only question ever asked of this table: how many times has this address
-- failed recently.
create index if not exists admin_login_attempts_ip_time_idx
  on public.admin_login_attempts (ip, attempted_at desc);

-- RLS on with no policy: reachable only through server code holding the service
-- role, like every other table that is nobody's business but the operator's.
alter table public.admin_login_attempts enable row level security;
