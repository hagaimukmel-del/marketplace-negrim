-- The backup ladder and the daily summary (communication plan, step 5).
--
--   reminder_log  one row per reminder step that happened, keyed by what it
--                 was ("order:<id>:2", "daily:<supplier>:<date>"). A step is
--                 claimed by inserting its key before anything is sent, so two
--                 servers running the ladder at once cannot both send it.
--
-- The notification kind 'reminder' joins the list: "order #12 is still waiting
-- for you" for the supplier, "the supplier has not answered yet" for the
-- carpentry.
--
-- Additive, except the kind check on notifications, which is widened. RLS on,
-- no policy: server only.

create table if not exists public.reminder_log (
  key         text primary key,
  created_at  timestamptz not null default now()
);

alter table public.reminder_log enable row level security;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'order_new', 'order_confirmed', 'order_rejected', 'order_shipped', 'order_delivered',
  'quote_new', 'quote_answered', 'quote_declined',
  'message_new',
  'email_failed',
  'reminder'
));
