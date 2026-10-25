-- Calls and WhatsApp messages that leave the site (communication plan, step 4).
--
-- The WhatsApp and call buttons open the carpenter's own phone; the site never
-- sees what was said. It can still know that it happened: one row per press,
-- so the reminder ladder (step 5) does not nag a supplier the carpenter has
-- just called, and the operator (step 6) sees which orders were chased by
-- phone. A press also leaves a line in the order's conversation when there is
-- one.
--
-- Additive only. RLS on, no policy: server only.

create table if not exists public.contact_clicks (
  id                uuid primary key default gen_random_uuid(),
  carpenter_id      uuid not null references public.carpenters(id) on delete cascade,
  supplier_id       uuid references public.suppliers(id) on delete cascade,
  order_id          uuid references public.orders(id) on delete cascade,
  quote_request_id  uuid references public.quote_requests(id) on delete cascade,
  channel           text not null check (channel in ('whatsapp', 'phone')),
  created_at        timestamptz not null default now()
);

create index if not exists contact_clicks_order_idx on public.contact_clicks (order_id, created_at desc)
  where order_id is not null;
create index if not exists contact_clicks_supplier_idx on public.contact_clicks (supplier_id, created_at desc);

alter table public.contact_clicks enable row level security;
