-- =============================================================================
-- 0001 · BASELINE
-- =============================================================================
-- Snapshot of the live schema of project ihburmhtcfhwlairyfyf as it stood on
-- 2026-09-06, captured by introspecting the running database (pg_constraint,
-- pg_indexes, pg_trigger, information_schema.columns, pg_policies).
--
-- The schema had been applied by hand through the dashboard and had DRIFTED
-- from docs/*.sql. Differences found and resolved in favour of the live DB:
--   * suppliers has no bank_*, profile_id or total_sales columns
--     (docs/SETUP_SUPPLIER_TABLES.sql creates them; they were never applied)
--   * the supplier_orders VIEW in that file was never created — it is not
--     valid SQL (its JOIN references p.id before products p is joined)
--   * idx_suppliers_email and the suppliers updated_at trigger do not exist
--   * products has NO foreign key to suppliers; supplier_id is a bare uuid
--
-- This file is written to be idempotent so it can be applied to the existing
-- database without changing anything. It is the starting point for every
-- migration that follows; do not edit it.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- functions
-- -----------------------------------------------------------------------------

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------

create table if not exists public.categories (
  id                 uuid primary key default uuid_generate_v4(),
  name_he            varchar not null,
  name_en            varchar,
  name_ar            varchar,
  parent_category_id uuid references public.categories (id),
  is_active          boolean default true,
  created_at         timestamp default now()
);

-- -----------------------------------------------------------------------------
-- profiles  (legacy: superseded in practice by user_profiles)
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key default uuid_generate_v4(),
  email        varchar not null unique,
  full_name    varchar not null,
  company_name varchar,
  phone        varchar,
  role         varchar not null
                 check (role in ('carpenter', 'supplier', 'admin')),
  is_approved  boolean default false,
  lang         varchar default 'he',
  created_at   timestamp default now(),
  updated_at   timestamp default now()
);

create index if not exists idx_profiles_email on public.profiles using btree (email);
create index if not exists idx_profiles_role  on public.profiles using btree (role);

-- -----------------------------------------------------------------------------
-- user_profiles  (the table the app actually reads)
-- -----------------------------------------------------------------------------

create table if not exists public.user_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('admin', 'supplier', 'carpenter')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------

create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  company_name varchar not null,
  business_id  varchar not null unique,
  contact_name varchar,
  email        varchar,
  phone        varchar,
  address      varchar,
  city         varchar,
  zip_code     varchar,
  is_verified  boolean default false,
  rating       numeric,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_suppliers_business_id on public.suppliers using btree (business_id);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
-- NOTE: supplier_id has no FK constraint in the live database. Left as-is here
-- so the baseline is a true snapshot; a later migration adds the constraint.

create table if not exists public.products (
  id                  uuid primary key default uuid_generate_v4(),
  supplier_id         uuid,
  category_id         uuid references public.categories (id),
  name_he             varchar not null,
  name_en             varchar,
  name_ar             varchar,
  description_he      text,
  description_en      text,
  image_url           varchar,
  base_price_excl_vat numeric not null,
  stock_qty           integer default 0,
  is_active           boolean default true,
  rating              numeric default 5.00,
  return_rate         numeric default 0.00,
  created_at          timestamp default now(),
  updated_at          timestamp default now()
);

create index if not exists idx_products_supplier_id on public.products using btree (supplier_id);
create index if not exists idx_products_category_id on public.products using btree (category_id);

-- -----------------------------------------------------------------------------
-- supplier_products  (junction; 32 rows, all pointing at the single supplier)
-- -----------------------------------------------------------------------------

create table if not exists public.supplier_products (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id  uuid not null references public.products  (id) on delete cascade,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  unique (supplier_id, product_id)
);

create index if not exists idx_supplier_products_supplier_id on public.supplier_products using btree (supplier_id);
create index if not exists idx_supplier_products_product_id  on public.supplier_products using btree (product_id);

-- -----------------------------------------------------------------------------
-- volume_pricing
-- -----------------------------------------------------------------------------

create table if not exists public.volume_pricing (
  id                  uuid primary key default uuid_generate_v4(),
  product_id          uuid not null references public.products (id) on delete cascade,
  min_qty             integer not null,
  max_qty             integer not null,
  unit_price_excl_vat numeric not null,
  created_at          timestamp default now()
);

create index if not exists idx_volume_pricing_product_id on public.volume_pricing using btree (product_id);

-- -----------------------------------------------------------------------------
-- orders  (flat model; the one the app writes to)
-- -----------------------------------------------------------------------------

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   varchar not null unique,
  customer_name  varchar not null,
  customer_email varchar not null,
  customer_phone varchar not null,
  business_name  varchar,
  address        varchar,
  city           varchar,
  zip_code       varchar,
  payment_method varchar default 'credit_card',
  total_amount   numeric not null,
  items_json     jsonb   not null,
  status         varchar default 'pending',
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_orders_customer_email on public.orders using btree (customer_email);
create index if not exists idx_orders_status         on public.orders using btree (status);
create index if not exists idx_orders_created_at     on public.orders using btree (created_at);

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();

-- -----------------------------------------------------------------------------
-- sub_orders / order_items  (normalized model; both empty, unused by the app)
-- -----------------------------------------------------------------------------

create table if not exists public.sub_orders (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            uuid not null,
  supplier_id         uuid not null,
  subtotal_excl_vat   numeric not null,
  vat_18              numeric not null,
  subtotal_incl_vat   numeric not null,
  shipping_fee        numeric default 0.00,
  supplier_commission numeric not null,
  status              varchar default 'pending',
  created_at          timestamp default now(),
  updated_at          timestamp default now()
);

create index if not exists idx_sub_orders_order_id    on public.sub_orders using btree (order_id);
create index if not exists idx_sub_orders_supplier_id on public.sub_orders using btree (supplier_id);

create table if not exists public.order_items (
  id                  uuid primary key default uuid_generate_v4(),
  sub_order_id        uuid not null references public.sub_orders (id) on delete cascade,
  product_id          uuid not null references public.products   (id),
  quantity            integer not null,
  unit_price_excl_vat numeric not null,
  line_total_excl_vat numeric,
  created_at          timestamp default now()
);

create index if not exists idx_order_items_sub_order_id on public.order_items using btree (sub_order_id);

-- -----------------------------------------------------------------------------
-- returns
-- -----------------------------------------------------------------------------

create table if not exists public.returns (
  id                     uuid primary key default uuid_generate_v4(),
  sub_order_id           uuid not null references public.sub_orders (id) on delete cascade,
  product_id             uuid not null references public.products   (id),
  carpenter_id           uuid not null references public.profiles   (id),
  quantity               integer not null,
  reason                 varchar,
  reason_detail          text,
  refund_amount_excl_vat numeric not null,
  status                 varchar default 'pending',
  approved_by            uuid references public.profiles (id),
  created_at             timestamp default now(),
  updated_at             timestamp default now()
);

create index if not exists idx_returns_sub_order_id on public.returns using btree (sub_order_id);
create index if not exists idx_returns_carpenter_id on public.returns using btree (carpenter_id);
create index if not exists idx_returns_status       on public.returns using btree (status);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------

create table if not exists public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.products (id) on delete cascade,
  carpenter_id uuid not null references public.profiles (id) on delete cascade,
  rating       integer not null check (rating >= 1 and rating <= 5),
  comment      text,
  created_at   timestamp default now()
);

create index if not exists idx_reviews_product_id on public.reviews using btree (product_id);

-- -----------------------------------------------------------------------------
-- row level security
-- -----------------------------------------------------------------------------
-- RLS is enabled on every table, but only orders / products / suppliers /
-- user_profiles carry policies. The other eight therefore return nothing to
-- the anon and authenticated roles — including supplier_products, which holds
-- 32 rows the application cannot read. Migration 0002 replaces all of this.

alter table public.categories        enable row level security;
alter table public.order_items       enable row level security;
alter table public.orders            enable row level security;
alter table public.products          enable row level security;
alter table public.profiles          enable row level security;
alter table public.returns           enable row level security;
alter table public.reviews           enable row level security;
alter table public.sub_orders        enable row level security;
alter table public.supplier_products enable row level security;
alter table public.suppliers         enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.volume_pricing    enable row level security;

do $$
begin
  -- orders
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Allow anyone to insert orders') then
    create policy "Allow anyone to insert orders" on public.orders for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Allow anyone to read orders') then
    create policy "Allow anyone to read orders" on public.orders for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Allow anyone to update order status') then
    create policy "Allow anyone to update order status" on public.orders for update using (true) with check (true);
  end if;

  -- products  (DANGEROUS: full write access to anyone holding the public key)
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Allow all operations') then
    create policy "Allow all operations" on public.products for all using (true) with check (true);
  end if;

  -- suppliers
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'suppliers' and policyname = 'Allow anyone to read') then
    create policy "Allow anyone to read" on public.suppliers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'suppliers' and policyname = 'Allow anyone to insert') then
    create policy "Allow anyone to insert" on public.suppliers for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'suppliers' and policyname = 'Allow anyone to update') then
    create policy "Allow anyone to update" on public.suppliers for update using (true) with check (true);
  end if;

  -- user_profiles
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'Users can read own profile') then
    create policy "Users can read own profile" on public.user_profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = user_id);
  end if;
end
$$;
