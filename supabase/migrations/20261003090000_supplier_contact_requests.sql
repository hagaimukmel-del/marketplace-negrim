-- Supplier contact requests: a carpenter asks a supplier for a quote or a
-- question from the procurement agent chat (/api/carpenter/contact-supplier).
--
-- The route was written against this table before it existed. One row per
-- request; nothing is sent yet — e-mailing the supplier is a later step.
--
-- RLS on, no policy: reachable only through server code holding the service
-- role, like orders and carpenters.

create table if not exists public.supplier_contact_requests (
  id uuid primary key default gen_random_uuid(),
  carpenter_id uuid not null references public.carpenters(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  action_type text not null,
  message text not null,
  created_at timestamptz not null default now(),

  constraint supplier_contact_requests_action_type_check
    check (action_type in ('quote_request', 'inquiry', 'support')),
  constraint supplier_contact_requests_message_check
    check (char_length(message) between 1 and 1000)
);

create index if not exists supplier_contact_requests_supplier_id_idx
  on public.supplier_contact_requests(supplier_id, created_at desc);
create index if not exists supplier_contact_requests_carpenter_id_idx
  on public.supplier_contact_requests(carpenter_id, created_at desc);

alter table public.supplier_contact_requests enable row level security;

comment on table public.supplier_contact_requests is
  'Carpenter-to-supplier requests from the agent chat (quote_request / inquiry / support). Service role only.';
