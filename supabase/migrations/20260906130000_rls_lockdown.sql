-- =============================================================================
-- 0002 · RLS LOCKDOWN
-- =============================================================================
-- The baseline left two holes that are reachable by anyone who opens the site,
-- because NEXT_PUBLIC_SUPABASE_ANON_KEY ships inside the browser bundle:
--
--   1. products carried  FOR ALL / public / USING (true) / WITH CHECK (true),
--      so any visitor could update or delete the entire catalogue.
--   2. orders carried a public SELECT, exposing every customer_name,
--      customer_email and customer_phone in the table.
--
-- New rule, applied here: the public key is read-only, and it can read only
-- catalogue data. Everything that is a business record — orders, order lines,
-- suppliers, returns, profiles — is reachable exclusively through server code
-- holding SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS by design.
--
-- Verified before writing: the browser bundle only ever queries `products`
-- (catalogue page) and `user_profiles` (auth context). Nothing client-side
-- reads suppliers, supplier_products or orders, so closing them breaks nothing.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- drop every existing policy in the public schema
-- -----------------------------------------------------------------------------
-- Named individually rather than looped so the diff shows exactly what is gone.

drop policy if exists "Allow all operations"                on public.products;
drop policy if exists "Allow anyone to insert orders"       on public.orders;
drop policy if exists "Allow anyone to read orders"         on public.orders;
drop policy if exists "Allow anyone to update order status" on public.orders;
drop policy if exists "Allow anyone to read"                on public.suppliers;
drop policy if exists "Allow anyone to insert"              on public.suppliers;
drop policy if exists "Allow anyone to update"              on public.suppliers;
drop policy if exists "Users can read own profile"          on public.user_profiles;
drop policy if exists "Users can insert own profile"        on public.user_profiles;

-- RLS must be on everywhere. A table with RLS enabled and no policy denies all
-- access to anon and authenticated, which is the intended state for most of
-- these; service_role is unaffected.

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

-- -----------------------------------------------------------------------------
-- catalogue: readable by anyone, writable by no one but the server
-- -----------------------------------------------------------------------------

create policy "catalogue_products_read"
  on public.products for select
  to anon, authenticated
  using (is_active is true);

create policy "catalogue_categories_read"
  on public.categories for select
  to anon, authenticated
  using (is_active is true);

-- Needed by the quantity ladder on the offer page.
create policy "catalogue_volume_pricing_read"
  on public.volume_pricing for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- user_profiles: a signed-in user sees and edits only its own row
-- -----------------------------------------------------------------------------
-- auth.uid() is wrapped in a scalar sub-select so the planner evaluates it once
-- per statement instead of once per row.

create policy "user_profiles_read_own"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- deliberately left with no policy — server-only
-- -----------------------------------------------------------------------------
--   orders, order_items, sub_orders  business records, contain customer PII
--   suppliers, supplier_products     supplier contact details invite bypass
--   returns, reviews, profiles       unused by the app today
--
-- Reads and writes for these go through route handlers using the service role.
-- Do not add an anon policy to any of them without deciding what it exposes.

-- -----------------------------------------------------------------------------
-- products.supplier_id had no foreign key; add it now that the data is clean
-- enough to carry one. 41 of 62 rows are still NULL, which the constraint
-- allows; migration 0003 fills them.
-- -----------------------------------------------------------------------------

alter table public.products
  drop constraint if exists products_supplier_id_fkey;

alter table public.products
  add constraint products_supplier_id_fkey
  foreign key (supplier_id) references public.suppliers (id) on delete set null;
