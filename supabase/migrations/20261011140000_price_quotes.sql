-- Per-supplier price visibility and quote requests (T-023, owner 2026-10-08,
-- plan doc "מודל משולב").
--
-- suppliers.price_mode: 'shown' (the default, and what every existing supplier
-- keeps) or 'quote'. A quote-only supplier's prices stay in supplier_offers and
-- are never deleted, so switching back is instant; the server simply leaves
-- them out of everything a carpenter, the operator or another supplier reads
-- (src/lib/app/catalog-server.ts, src/lib/procurement-agent.ts), and
-- /api/orders refuses to order from that supplier without an answered quote.
--
-- quote_requests: a carpentry asks one supplier for a price on one product and
-- quantity. The supplier answers with a unit price excl. VAT per base unit and a
-- validity date, or declines. The carpentry accepts by adding the quote to the
-- cart; the purchase order it becomes goes through /api/orders like any other,
-- with the quoted price snapshotted on the order line and order_id stamped
-- here. A quote is also offered on products that do show a price, for a large
-- quantity.
--
-- Status: requested -> quoted | declined; quoted -> accepted | rejected
-- (the carpentry said no); requested -> cancelled (the carpentry withdrew).
-- An answer past valid_until is read as expired; no job rewrites it.
--
-- RLS on, no policy: server code with the service role only, like orders.
-- The operator sees that a request exists and whether it was answered, never
-- the quoted price (src/lib/quotes-server.ts). Read tolerantly, so the site
-- keeps working before this migration is applied.

alter table public.suppliers
  add column if not exists price_mode text not null default 'shown';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suppliers_price_mode') then
    alter table public.suppliers
      add constraint suppliers_price_mode check (price_mode in ('shown', 'quote'));
  end if;
end $$;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  carpenter_id uuid not null references public.carpenters(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  -- In the product's base unit, like order_items.quantity.
  quantity numeric(12, 3) not null,
  note text,
  status text not null default 'requested',
  -- Per base unit, excl. VAT. Set only when the supplier answers.
  quoted_unit_price_excl_vat numeric(10, 2),
  valid_until date,
  supplier_note text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  decided_at timestamptz,
  constraint quote_requests_status check (status in ('requested', 'quoted', 'declined', 'accepted', 'rejected', 'cancelled')),
  constraint quote_requests_quantity check (quantity > 0),
  constraint quote_requests_price check (quoted_unit_price_excl_vat is null or quoted_unit_price_excl_vat > 0),
  constraint quote_requests_answer check (status <> 'quoted' or (quoted_unit_price_excl_vat is not null and valid_until is not null))
);

create index if not exists quote_requests_supplier on public.quote_requests (supplier_id, created_at desc);
create index if not exists quote_requests_carpenter on public.quote_requests (carpenter_id, created_at desc);

alter table public.quote_requests enable row level security;
