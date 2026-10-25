-- One notification layer for carpenters and suppliers (communication plan, step 1).
--
-- Until now every email was sent once, inline, and forgotten: a provider
-- hiccup lost it, nothing recorded whether it went out, and the bell only
-- counted unread message threads. Two tables replace that:
--
--   notifications  what a party sees under the bell in the site: a new order,
--                  an order confirmed / rejected / shipped / received, a quote
--                  request or its answer, a new message. Written in the same
--                  request as the event itself, so an event never exists
--                  without its notification.
--   email_outbox   every email the site owes someone, with its status, how
--                  many times it was tried, when it is tried next and the last
--                  error. lib/outbox.ts sends and retries from here. The
--                  delivered/bounced statuses are filled by the provider's
--                  webhook (step 2).
--
-- claim_email_outbox() hands rows to exactly one sender at a time (row locks,
-- skip locked), so the request that queued a mail and the scheduled retry can
-- never both send it. A row stuck in 'sending' (a sender that died) is handed
-- out again after five minutes; the provider's idempotency key (the row id)
-- keeps that from becoming a second email.
--
-- Additive only. RLS on, no policy: server only, like messages and orders.

create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_side    text not null check (recipient_side in ('carpenter', 'supplier')),
  carpenter_id      uuid references public.carpenters(id) on delete cascade,
  supplier_id       uuid references public.suppliers(id) on delete cascade,
  kind              text not null check (kind in (
                      'order_new', 'order_confirmed', 'order_rejected', 'order_shipped', 'order_delivered',
                      'quote_new', 'quote_answered', 'quote_declined',
                      'message_new'
                    )),
  title             text not null,
  body              text,
  -- A path inside the site, e.g. /app/orders/<id>. Never an absolute URL.
  link              text not null check (link like '/%'),
  order_id          uuid references public.orders(id) on delete cascade,
  quote_request_id  uuid references public.quote_requests(id) on delete cascade,
  thread_id         uuid references public.message_threads(id) on delete cascade,
  read_at           timestamptz,
  created_at        timestamptz not null default now(),
  constraint notifications_recipient check (
    (recipient_side = 'carpenter' and carpenter_id is not null) or
    (recipient_side = 'supplier' and supplier_id is not null)
  )
);

create index if not exists notifications_carpenter_idx on public.notifications (carpenter_id, created_at desc)
  where carpenter_id is not null;
create index if not exists notifications_supplier_idx on public.notifications (supplier_id, created_at desc)
  where supplier_id is not null;
create index if not exists notifications_thread_unread_idx on public.notifications (thread_id)
  where thread_id is not null and read_at is null;

alter table public.notifications enable row level security;

create table if not exists public.email_outbox (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid references public.notifications(id) on delete set null,
  -- What the mail is about, for the operator's view and for counting.
  kind              text not null,
  to_email          text not null,
  subject           text not null,
  html              text not null,
  reply_to          text,
  -- Redirect to the test inbox (a business marked "ניסיון"); decided at queue time.
  is_test           boolean not null default false,
  -- Mails with the same key within a short window are folded into one
  -- (a burst of chat messages becomes one email).
  dedupe_key        text,
  status            text not null default 'pending' check (status in (
                      'pending', 'sending', 'sent', 'delivered', 'bounced', 'failed', 'skipped'
                    )),
  attempts          integer not null default 0,
  next_attempt_at   timestamptz not null default now(),
  locked_at         timestamptz,
  last_error        text,
  provider_id       text,
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists email_outbox_due_idx on public.email_outbox (next_attempt_at)
  where status in ('pending', 'sending');
create index if not exists email_outbox_dedupe_idx on public.email_outbox (dedupe_key, created_at desc)
  where dedupe_key is not null;
create index if not exists email_outbox_notification_idx on public.email_outbox (notification_id)
  where notification_id is not null;

alter table public.email_outbox enable row level security;

-- Hand out up to p_limit due rows (or exactly the rows in p_ids that are due),
-- marking them 'sending' and counting the attempt.
create or replace function public.claim_email_outbox(p_limit integer default 20, p_ids uuid[] default null)
returns setof public.email_outbox
language sql
security definer
set search_path = public
as $$
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1, locked_at = now()
   where o.id in (
     select id from public.email_outbox
      where ((status = 'pending' and next_attempt_at <= now())
             or (status = 'sending' and locked_at < now() - interval '5 minutes'))
        and (p_ids is null or id = any(p_ids))
      order by next_attempt_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning o.*;
$$;

revoke all on function public.claim_email_outbox(integer, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer, uuid[]) to service_role;
