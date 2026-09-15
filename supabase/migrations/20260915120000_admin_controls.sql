-- What the operator needs to run the marketplace rather than just watch it:
-- stop a supplier or carpenter, know who accepted the terms and which version,
-- and draw a winner among carpenters with a record of every draw.

-- A blocked supplier. Different from rejected: rejected is an application that
-- never became a supplier; blocked is a supplier who traded and was stopped.
-- Their offers leave the catalogue (the reads require an approved supplier) but
-- stay in the database, so unblocking brings everything back as it was.
alter table public.suppliers drop constraint if exists suppliers_status_check;
alter table public.suppliers
  add constraint suppliers_status_check
  check (status in ('pending', 'approved', 'rejected', 'blocked'));

-- Terms acceptance. The version is stored with the time, because "accepted the
-- terms" means nothing once the terms have changed - a new version asks again.
alter table public.carpenters
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists marketing_consent boolean not null default false;

alter table public.suppliers
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

comment on column public.carpenters.marketing_consent is
  'Opted in to promotional email (updates, deals, draws). Required by law before sending advertising; operational mail about orders does not need it.';

-- Every draw, including who was in the pool. The winner's name is a snapshot:
-- a carpenter deleted later must not turn a past draw into a blank line.
create table if not exists public.raffle_draws (
  id            uuid primary key default gen_random_uuid(),
  carpenter_id  uuid references public.carpenters(id) on delete set null,
  winner_name   text not null,
  winner_email  text,
  prize         text,
  pool_size     integer not null check (pool_size > 0),
  included_test boolean not null default false,
  drawn_at      timestamptz not null default now(),
  notified_at   timestamptz
);

create index if not exists raffle_draws_drawn_at_idx on public.raffle_draws (drawn_at desc);

-- Server-only, like every other table holding people's details.
alter table public.raffle_draws enable row level security;
