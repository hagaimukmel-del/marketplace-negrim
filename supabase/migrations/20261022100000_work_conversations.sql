-- נגרים עובדים ביחד, phase 2: private conversations between carpentries.
--
-- "אני מעוניין" on a job opens one conversation between the poster and the
-- carpentry that answered, with a first message. Each message may carry one
-- file: a photo or a PDF (owner, 2026-10-15; CNC and CAD files later).
--
-- Its own tables, the same shape as message_threads/messages (carpentry and
-- supplier, live in production) but apart from them, so a bug here cannot
-- show a carpentry somebody else's talk with a supplier (spec-v2 §5, option
-- ב). Email notifications are phase 3.
--
-- Additive only: no existing table changes. RLS on, no policy: server only.

create table if not exists public.work_conversations (
  id                     uuid primary key default gen_random_uuid(),
  job_id                 uuid not null references public.work_jobs(id) on delete cascade,
  -- Denormalised from the job so every read can filter on the asking party.
  poster_id              uuid not null references public.carpenters(id) on delete cascade,
  applicant_id           uuid not null references public.carpenters(id) on delete cascade,
  created_at             timestamptz not null default now(),
  last_message_at        timestamptz not null default now(),
  last_sender            text not null check (last_sender in ('poster', 'applicant')),
  poster_last_read_at    timestamptz,
  applicant_last_read_at timestamptz,
  -- Either side may block the other; the conversation is then read-only for
  -- both until the side that blocked lifts it.
  blocked_by             text check (blocked_by is null or blocked_by in ('poster', 'applicant')),

  constraint work_conversations_two_sides check (poster_id <> applicant_id),
  -- One conversation per job and carpentry that answered.
  constraint work_conversations_one_per_applicant unique (job_id, applicant_id)
);

create index if not exists work_conversations_poster_idx on public.work_conversations (poster_id, last_message_at desc);
create index if not exists work_conversations_applicant_idx on public.work_conversations (applicant_id, created_at desc);

create table if not exists public.work_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.work_conversations(id) on delete cascade,
  sender           text not null check (sender in ('poster', 'applicant')),
  body             text not null default '' check (char_length(body) <= 2000),
  -- One file at most, in the private work-files bucket. The path is never
  -- sent to a browser; downloads go through a server route that checks the
  -- carpentry is a side of the conversation and hands out a short-lived link.
  file_path        text,
  file_name        text check (file_name is null or char_length(file_name) <= 200),
  file_type        text check (file_type is null or file_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size        integer check (file_size is null or file_size > 0),
  created_at       timestamptz not null default now(),

  constraint work_messages_has_content check (char_length(body) > 0 or file_path is not null),
  constraint work_messages_file_complete check (
    (file_path is null and file_name is null and file_type is null and file_size is null)
    or (file_path is not null and file_name is not null and file_type is not null and file_size is not null)
  )
);

create index if not exists work_messages_conversation_idx on public.work_messages (conversation_id, created_at);

alter table public.work_conversations enable row level security;
alter table public.work_messages enable row level security;

-- Private: drawings and photos of a client's job. 10 MB, photos and PDF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-files', 'work-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
