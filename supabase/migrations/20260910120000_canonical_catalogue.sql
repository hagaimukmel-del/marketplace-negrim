-- The catalogue splits in two: a canonical product, and one offer per supplier.
--
-- Until now a row in `products` was one supplier's row. With more than one
-- supplier that shape cannot answer the question the marketplace exists to
-- answer - who sells this, and for how much - because the same physical
-- product becomes N unrelated rows that nothing links together.
--
--   products         what the thing IS   - name, brand, spec, unit, picture
--   supplier_offers  what it COSTS       - price, stock, pack, lead time
--
-- Matching a supplier's upload to a canonical product is brand + manufacturer
-- part number where the supplier has them, and a suggestion the supplier
-- confirms where they do not. The schema therefore treats mpn as optional: a
-- required one would exclude most of the market.
--
-- This migration only ADDS. The columns that moved out of `products` are still
-- there and still populated, so a deploy in either order keeps working; they
-- are dropped by a later migration once nothing reads them. Expanding and
-- contracting in one step would mean the running site loses its prices the
-- moment the migration lands and before the new code does.

-- -----------------------------------------------------------------------------
-- 1. the canonical product
-- -----------------------------------------------------------------------------

alter table public.products
  add column if not exists brand text,
  add column if not exists mpn text,
  add column if not exists base_unit text not null default 'unit',
  add column if not exists attributes jsonb not null default '{}'::jsonb;

comment on column public.products.mpn is
  'Manufacturer part number. The strong matching key when a supplier has one.';
comment on column public.products.base_unit is
  'Closed vocabulary, owned by the platform. Prices are always per base unit, which is what makes two suppliers comparable when one sells a carton of 25 and the other a sleeve of 6.';
comment on column public.products.attributes is
  'Shared technical facts - application, open time, thickness. Lives on the product so one supplier filling it in serves every offer.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_base_unit_check') then
    alter table public.products
      add constraint products_base_unit_check
      check (base_unit in ('unit', 'kg', 'liter', 'meter', 'sqm'));
  end if;
end $$;

-- Brand + part number identify a product across every supplier that carries it.
create unique index if not exists products_brand_mpn_idx
  on public.products (lower(brand), lower(mpn))
  where brand is not null and mpn is not null;

-- -----------------------------------------------------------------------------
-- 2. the offer
-- -----------------------------------------------------------------------------

create table if not exists public.supplier_offers (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,

  supplier_sku   text,
  price_excl_vat numeric not null check (price_excl_vat > 0),
  stock_qty      integer not null default 0 check (stock_qty >= 0),

  -- What you actually buy. The label is the supplier's own word, the quantity
  -- is how many base units are inside it, and the price above is per base unit
  -- so the two are always comparable.
  pack_label     text,
  pack_qty       numeric check (pack_qty is null or pack_qty > 0),

  min_order_qty  numeric not null default 1 check (min_order_qty > 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),

  is_active      boolean not null default true,
  source         text not null default 'manual',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- One offer per supplier per product. A supplier listing the same product
  -- twice is a duplicate, not two prices.
  unique (product_id, supplier_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'supplier_offers_source_check') then
    alter table public.supplier_offers
      add constraint supplier_offers_source_check
      check (source in ('sheet', 'manual', 'upload'));
  end if;
end $$;

create index if not exists supplier_offers_product_idx  on public.supplier_offers (product_id);
create index if not exists supplier_offers_supplier_idx on public.supplier_offers (supplier_id);

-- A supplier's own catalogue number is unique within that supplier only.
create unique index if not exists supplier_offers_supplier_sku_idx
  on public.supplier_offers (supplier_id, supplier_sku)
  where supplier_sku is not null;

-- -----------------------------------------------------------------------------
-- 3. supplier-level trading terms
-- -----------------------------------------------------------------------------

alter table public.suppliers
  add column if not exists min_order_value_excl_vat numeric
    check (min_order_value_excl_vat is null or min_order_value_excl_vat >= 0),
  add column if not exists default_lead_time_days integer
    check (default_lead_time_days is null or default_lead_time_days >= 0),
  add column if not exists pickup_address text;

comment on column public.suppliers.min_order_value_excl_vat is
  'Shown in the cart per supplier. A carpenter who only learns about it on the phone does not come back.';

-- -----------------------------------------------------------------------------
-- 4. carry the existing catalogue across
-- -----------------------------------------------------------------------------

insert into public.supplier_offers
  (product_id, supplier_id, supplier_sku, price_excl_vat, stock_qty, is_active, source)
select p.id,
       p.supplier_id,
       p.sku,
       p.base_price_excl_vat,
       coalesce(p.stock_qty, 0),
       coalesce(p.is_active, true),
       case
         when coalesce(p.source, 'sheet') in ('sheet', 'manual') then coalesce(p.source, 'sheet')
         else 'manual'
       end
  from public.products p
 where p.supplier_id is not null
   and p.base_price_excl_vat is not null
   and p.base_price_excl_vat > 0
on conflict (product_id, supplier_id) do nothing;

-- An order line already snapshots its own price and name, but not who was
-- meant to supply it. One cart will soon become one purchase order per
-- supplier, and that needs to be recorded from now on.
alter table public.order_items
  add column if not exists supplier_id uuid references public.suppliers(id);

update public.order_items oi
   set supplier_id = o.supplier_id
  from public.supplier_offers o
 where o.product_id = oi.product_id
   and oi.supplier_id is null;

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
-- Offers carry prices, and the catalogue is public today, so the public key
-- reads active offers exactly as it reads active products. Writes stay with
-- the service role. When prices move behind a login this is the single policy
-- that changes.

alter table public.supplier_offers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'supplier_offers'
       and policyname = 'Public read of active offers'
  ) then
    create policy "Public read of active offers"
      on public.supplier_offers for select
      using (is_active = true);
  end if;
end $$;
