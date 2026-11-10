-- דרושים: job ads, posted by carpentries and by suppliers.
--
-- A carpentry looking for a production carpenter, a supplier looking for a
-- driver or a sales rep. Both sides post and both sides read the board. The
-- site only shows the ad: whoever is interested calls or sends a WhatsApp,
-- and the phone is revealed on a tap to a signed-in carpentry or supplier.
--
-- Its own table, not work_jobs: the work board (נגרים עובדים ביחד) is jobs
-- between carpentries and reports "דרוש עובד" as off-topic there. This is
-- where those ads go.
--
-- Every field is free text, as the owner asked (2026-11-10), except the region
-- (six regions, the owner's list) and how the work days are given: weekdays,
-- specific dates picked on a calendar, or typed freely.
--
-- One owner per ad: a carpenter or a supplier (job_posts_one_owner). RLS on and
-- no policy: read and written only by server code holding the service role.

create table if not exists public.job_posts (
  id            uuid primary key default gen_random_uuid(),
  carpenter_id  uuid references public.carpenters(id) on delete cascade,
  supplier_id   uuid references public.suppliers(id) on delete cascade,

  business_name text not null check (char_length(business_name) between 2 and 80),
  region        text not null check (region in ('north', 'sharon', 'center', 'shfela', 'jerusalem', 'south')),
  location      text not null check (char_length(location) between 2 and 80),
  role          text not null check (char_length(role) between 2 and 80),
  salary        text check (salary is null or char_length(salary) <= 80),

  days_mode     text not null check (days_mode in ('weekdays', 'dates', 'free')),
  -- 0 = Sunday … 5 = Friday. Set when days_mode = 'weekdays'.
  weekdays      smallint[] not null default '{}',
  -- Set when days_mode = 'dates'.
  work_dates    date[] not null default '{}',
  -- Set when days_mode = 'free'.
  days_text     text check (days_text is null or char_length(days_text) <= 120),
  hours         text check (hours is null or char_length(hours) <= 40),

  scope         text check (scope is null or scope in ('full', 'part', 'temp', 'freelance')),
  description   text check (description is null or char_length(description) <= 600),
  contact_phone text not null,

  status        text not null default 'open' check (status in ('open', 'closed', 'removed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  closed_at     timestamptz,

  constraint job_posts_one_owner check ((carpenter_id is null) <> (supplier_id is null))
);

create index if not exists job_posts_open_idx
  on public.job_posts (created_at desc) where status = 'open';
create index if not exists job_posts_carpenter_idx
  on public.job_posts (carpenter_id) where carpenter_id is not null;
create index if not exists job_posts_supplier_idx
  on public.job_posts (supplier_id) where supplier_id is not null;

alter table public.job_posts enable row level security;

comment on table public.job_posts is
  'דרושים: job ads by carpentries and suppliers (/app/jobs, /supplier/jobs). Service role only.';
