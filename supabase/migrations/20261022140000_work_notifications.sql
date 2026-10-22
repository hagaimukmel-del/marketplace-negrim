-- נגרים עובדים ביחד, phase 3: email notifications.
--
-- Three kinds (spec-v2 §3.7): a job that fits the carpentry's profile, an
-- answer to my job, and a new message. One row per email the server decided
-- on, sent or held back by the daily cap, so the cap can be counted and the
-- matching measured later (the future job-matching agent learns from it).
--
-- Additive only: no existing table changes. RLS on, no policy: server only.

create table if not exists public.work_notifications (
  id               uuid primary key default gen_random_uuid(),
  carpenter_id     uuid not null references public.carpenters(id) on delete cascade,
  kind             text not null check (kind in ('job_match', 'answer', 'message')),
  job_id           uuid references public.work_jobs(id) on delete cascade,
  conversation_id  uuid references public.work_conversations(id) on delete cascade,
  -- sent: handed to the mail provider. capped: over the daily cap, not sent.
  -- failed: the provider refused it.
  status           text not null check (status in ('sent', 'capped', 'failed')),
  created_at       timestamptz not null default now()
);

create index if not exists work_notifications_carpenter_idx on public.work_notifications (carpenter_id, created_at desc);
create index if not exists work_notifications_conversation_idx on public.work_notifications (conversation_id, created_at desc)
  where conversation_id is not null;

alter table public.work_notifications enable row level security;
