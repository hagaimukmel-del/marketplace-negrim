-- נגרים עובדים ביחד, phase 1: a job board between carpentries.
--
-- A carpentry with a job it needs help on posts it; a carpentry that fits
-- (type of work, region) answers. Its own tables, deliberately apart from
-- המציאון (things, not work) and from the supplier messages (live in
-- production, tied to the RFQ work). Phase 2 adds conversations and files,
-- phase 3 email notifications, phase 4 billing; none of them is here.
--
-- Additive only: no existing table changes.

-- A carpentry's capabilities: what it does and where. Used to match job
-- notifications (phase 3) and shown to a poster when someone answers. Never
-- listed or searchable, so it cannot turn into an "I'm available" board.
create table if not exists public.work_profiles (
  carpenter_id  uuid primary key references public.carpenters(id) on delete cascade,
  job_types     text[] not null default '{}'
                check (job_types <@ array['cnc', 'edging', 'paint', 'fronts', 'carcasses', 'install', 'project_help', 'other']::text[]),
  regions       text[] not null default '{}'
                check (regions <@ array['north', 'haifa', 'sharon', 'center', 'shfela', 'jerusalem', 'south']::text[]),
  machines      text check (machines is null or char_length(machines) <= 300),
  notify_email  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- A job: existing work that needs another pair of hands. No free title, no
-- price and no client details by design; the closed type list is the title.
create table if not exists public.work_jobs (
  id            uuid primary key default gen_random_uuid(),
  carpenter_id  uuid not null references public.carpenters(id) on delete cascade,

  job_type      text not null
                check (job_type in ('cnc', 'edging', 'paint', 'fronts', 'carcasses', 'install', 'project_help', 'other')),
  region        text not null
                check (region in ('north', 'haifa', 'sharon', 'center', 'shfela', 'jerusalem', 'south')),
  quantity      text not null check (char_length(quantity) between 1 and 80),
  material      text check (material is null or char_length(material) <= 120),
  due_date      date not null,
  description   text not null check (char_length(description) between 10 and 800),
  image_url     text,

  -- paused = taken off the board by reports until the operator looks at it.
  status        text not null default 'open' check (status in ('open', 'closed', 'removed', 'paused')),
  -- How the poster says it ended: the number that proves the service works.
  close_outcome text check (close_outcome is null or close_outcome in ('via_nagarim', 'other_way', 'cancelled')),
  -- Optional "with which carpentry", for matching to learn from later.
  closed_with_carpenter_id uuid references public.carpenters(id) on delete set null,
  removed_reason text,

  -- Off the board at the due date, 30 days at most. A filter at query time,
  -- like המציאון: nothing to forget to run.
  expires_at    timestamptz not null,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists work_jobs_board_idx on public.work_jobs (status, expires_at desc);
create index if not exists work_jobs_carpenter_idx on public.work_jobs (carpenter_id, created_at desc);
create index if not exists work_jobs_region_idx on public.work_jobs (region);

create table if not exists public.work_job_reports (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.work_jobs(id) on delete cascade,
  reporter_id  uuid references public.carpenters(id) on delete set null,
  reason       text not null check (reason in ('not_real', 'service_ad', 'hiring', 'inappropriate', 'duplicate')),
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index if not exists work_job_reports_open_idx on public.work_job_reports (created_at desc) where resolved_at is null;

-- Who may use the service. No row = no subscription (view only, poster
-- hidden). "founding" is the free launch: every carpentry that fills a
-- profile gets it. "active" is a paid fixed term (half a year or a year,
-- paid up front, possibly in card installments); it ends at ends_at with no
-- automatic renewal. Payment itself is phase 4: these columns are where its
-- snapshots will land, nothing writes them yet.
create table if not exists public.work_subscriptions (
  carpenter_id   uuid primary key references public.carpenters(id) on delete cascade,
  status         text not null check (status in ('founding', 'active', 'cancelled')),
  plan           text check (plan is null or plan in ('half_year', 'year')),
  price_excl_vat numeric check (price_excl_vat is null or price_excl_vat >= 0),
  vat_rate       numeric,
  installments   integer check (installments is null or installments between 1 and 12),
  payment_ref    text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  cancelled_at   timestamptz,
  cancel_fee_excl_vat numeric,
  refund_excl_vat     numeric,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint work_subscriptions_active_has_term check (
    status <> 'active' or (plan is not null and starts_at is not null and ends_at is not null)
  )
);

-- Server-only, like every table that holds people's details.
alter table public.work_profiles enable row level security;
alter table public.work_jobs enable row level security;
alter table public.work_job_reports enable row level security;
alter table public.work_subscriptions enable row level security;

-- One photo per job. Public URLs like the המציאון photos: the job details,
-- photo included, are visible to every registered carpentry; only the
-- poster's identity sits behind the subscription.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-images', 'work-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
