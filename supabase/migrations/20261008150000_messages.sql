-- Messages between a carpentry and a supplier, inside the site (T-025).
--
-- One thread per question or per order; each thread has messages from either
-- side. The bell counts threads with a message newer than that side's
-- last_read_at. "טופל" (status 'handled') closes a thread until either side
-- writes again. Notifications go out by email only (owner, 2026-10-08).
--
-- Existing supplier_contact_requests rows are copied in as threads with their
-- question as the first message, linked by contact_request_id so a re-run
-- copies nothing twice. New questions from the agent chat write both.
--
-- RLS on, no policy: service role only, through src/lib/messages.ts. The admin
-- console reads thread counts and answered/unanswered, never message bodies.

create table if not exists public.message_threads (
  id                     uuid primary key default gen_random_uuid(),
  carpenter_id           uuid not null references public.carpenters(id) on delete cascade,
  supplier_id            uuid not null references public.suppliers(id) on delete cascade,
  order_id               uuid references public.orders(id) on delete set null,
  product_id             uuid references public.products(id) on delete set null,
  contact_request_id     uuid unique references public.supplier_contact_requests(id) on delete set null,
  subject                text not null check (char_length(subject) between 1 and 200),
  status                 text not null default 'open' check (status in ('open', 'handled')),
  created_at             timestamptz not null default now(),
  last_message_at        timestamptz not null default now(),
  last_sender            text not null check (last_sender in ('carpenter', 'supplier')),
  carpenter_last_read_at timestamptz,
  supplier_last_read_at  timestamptz
);

create unique index if not exists message_threads_order_idx
  on public.message_threads(order_id) where order_id is not null;
create index if not exists message_threads_carpenter_idx
  on public.message_threads(carpenter_id, last_message_at desc);
create index if not exists message_threads_supplier_idx
  on public.message_threads(supplier_id, last_message_at desc);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.message_threads(id) on delete cascade,
  sender     text not null check (sender in ('carpenter', 'supplier')),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on public.messages(thread_id, created_at);

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

-- Earlier questions from the agent chat become threads.
insert into public.message_threads
  (carpenter_id, supplier_id, product_id, contact_request_id, subject, created_at, last_message_at, last_sender)
select r.carpenter_id, r.supplier_id, r.product_id, r.id,
       coalesce(left(p.name_he, 200), 'שאלה לספק'),
       r.created_at, r.created_at, 'carpenter'
from public.supplier_contact_requests r
left join public.products p on p.id = r.product_id
on conflict (contact_request_id) do nothing;

insert into public.messages (thread_id, sender, body, created_at)
select t.id, 'carpenter', left(r.message, 2000), r.created_at
from public.message_threads t
join public.supplier_contact_requests r on r.id = t.contact_request_id
where not exists (select 1 from public.messages m where m.thread_id = t.id);
