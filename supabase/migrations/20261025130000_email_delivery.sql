-- Knowing whether an email arrived (communication plan, step 2).
--
-- Resend reports what happened to each mail through a webhook
-- (/api/webhooks/resend): delivered, bounced, complained, failed. The outbox
-- row already has the statuses for it; this adds when the report came, the
-- addresses that must not be mailed again, and a notification kind for "the
-- email you caused did not arrive", which goes to the other side's bell.
--
--   email_suppressions  an address that bounced permanently or marked us as
--                       spam. New mail to it is not sent (it would only bounce
--                       again and hurt the sending domain); the sender is told
--                       at once, and the owner of the address sees a banner
--                       asking to fix it. Changing the address clears it,
--                       because the new address is not in the table.
--
-- Additive, except the kind check on notifications, which is replaced with a
-- wider one (every existing kind stays valid). RLS on, no policy: server only.

alter table public.email_outbox add column if not exists delivery_updated_at timestamptz;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'order_new', 'order_confirmed', 'order_rejected', 'order_shipped', 'order_delivered',
  'quote_new', 'quote_answered', 'quote_declined',
  'message_new',
  'email_failed'
));

create table if not exists public.email_suppressions (
  -- Always lower-cased.
  email       text primary key check (email = lower(email)),
  reason      text not null check (reason in ('bounced', 'complained')),
  detail      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;

create index if not exists email_outbox_provider_idx on public.email_outbox (provider_id)
  where provider_id is not null;
