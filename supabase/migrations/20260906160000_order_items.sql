-- =============================================================================
-- 0004 · ORDER LINES
-- =============================================================================
-- Replaces orders.items_json with real order lines.
--
-- The JSONB blob blocks four things at once: a supplier cannot be shown only
-- its own lines (no RLS policy can reach inside a blob), stock cannot be
-- decremented, "what did this carpenter order last time" cannot be queried,
-- and no report can sum by product. It was also being written double-encoded —
-- checkout-context called JSON.stringify() on the array before handing it to a
-- jsonb column — so the reader had to JSON.parse a value the driver had
-- already parsed once.
--
-- Lines hang off `orders` directly. The empty sub_orders table modelled a
-- per-supplier split that is deliberately out of scope while there is one
-- supplier; it comes back when a second one signs, and re-adding it then is a
-- new table plus a nullable column, not a rewrite.
--
-- Amounts are snapshots. unit_price_excl_vat and product_name_he are copied at
-- order time and never recomputed from the product row, so a price change or a
-- retired product cannot rewrite history.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- safety: this migration does not carry items_json data across
-- -----------------------------------------------------------------------------
-- There were zero orders when it was written. If that is no longer true, stop
-- rather than silently dropping the column, and migrate the blob by hand first.

do $$
declare
  order_count bigint;
begin
  select count(*) into order_count from public.orders;
  if order_count > 0 then
    raise exception
      'orders holds % row(s); migration 0004 would drop items_json without '
      'migrating them. Back the data out into order_items before applying.',
      order_count;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- returns pointed at sub_orders, which is about to go
-- -----------------------------------------------------------------------------

alter table public.returns drop constraint if exists returns_sub_order_id_fkey;
drop index if exists idx_returns_sub_order_id;

alter table public.returns rename column sub_order_id to order_id;

alter table public.returns
  add constraint returns_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete cascade;

create index if not exists idx_returns_order_id on public.returns using btree (order_id);

-- -----------------------------------------------------------------------------
-- rebuild order_items against orders
-- -----------------------------------------------------------------------------

drop table if exists public.order_items;
drop table if exists public.sub_orders;

create table public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,

  -- kept for reporting; nulled rather than blocking if a product is ever hard
  -- deleted, because the snapshot below is what the line actually means
  product_id          uuid references public.products (id) on delete set null,

  -- snapshots taken at order time, never recomputed
  product_name_he     varchar not null,
  product_name_en     varchar,
  unit_price_excl_vat numeric not null check (unit_price_excl_vat >= 0),
  quantity            integer not null check (quantity > 0),
  line_total_excl_vat numeric not null check (line_total_excl_vat >= 0),

  created_at          timestamptz not null default now()
);

create index idx_order_items_order_id   on public.order_items using btree (order_id);
create index idx_order_items_product_id on public.order_items using btree (product_id);

alter table public.order_items enable row level security;

-- No policy: order lines are business records, reachable only through route
-- handlers holding the service role. Same rule as orders itself.

-- -----------------------------------------------------------------------------
-- money on the order
-- -----------------------------------------------------------------------------
-- Prices are stored excluding VAT and subtotal_excl_vat is the binding figure.
-- vat_rate is a snapshot so a future rate change does not silently restate old
-- orders, and so the rate stops being hard-coded as `* 1.18` inside
-- cart-context.tsx. VAT here is indicative only: the supplier issues the
-- invoice, and an order in this system is a purchase order, not a tax document.

alter table public.orders
  add column if not exists subtotal_excl_vat numeric not null default 0
    check (subtotal_excl_vat >= 0);

alter table public.orders
  add column if not exists vat_rate numeric not null default 0.18
    check (vat_rate >= 0 and vat_rate < 1);

comment on column public.orders.subtotal_excl_vat is
  'Sum of order_items.line_total_excl_vat at order time. The binding figure.';
comment on column public.orders.vat_rate is
  'VAT rate snapshot at order time. Display only; the supplier invoices.';
comment on column public.orders.total_amount is
  'Indicative total including VAT, for display. Not a tax figure.';

alter table public.orders drop column if exists items_json;
