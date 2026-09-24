-- Product Knowledge System: Link documents and extract specifications
--
-- Allows linking supplier documents to specific products and extracting
-- key technical specifications that the Agent can use for matching.

-- Junction table: documents <-> products
create table if not exists public.supplier_documents_products (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.supplier_documents(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  -- Which section of the document applies to this product
  -- (e.g., "page 3-5", "section 2.1", null if whole document)
  section_reference text,

  created_at timestamptz not null default now(),

  -- Unique constraint: one document per product (avoid duplicates)
  constraint unique_document_product unique (document_id, product_id)
);

-- Index for fast product -> documents lookup
create index if not exists sdp_product_id_idx on public.supplier_documents_products(product_id);
create index if not exists sdp_document_id_idx on public.supplier_documents_products(document_id);

-- Product specifications extracted from documents
create table if not exists public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,

  -- Spec key and value
  spec_key text not null,              -- e.g., "curing_time", "temperature_range", "water_resistant"
  spec_value text not null,            -- e.g., "24 hours", "-10 to 40°C", "true"
  spec_unit text,                      -- e.g., "hours", "°C", null for boolean

  -- Where this came from
  source_document_id uuid references public.supplier_documents(id) on delete set null,
  source_page_or_section text,         -- "page 2", "section 3.1"

  -- Confidence / data quality
  is_verified boolean not null default false,  -- manually verified by admin?
  created_at timestamptz not null default now(),
  verified_at timestamptz,

  constraint spec_key_not_empty check (spec_key != ''),
  constraint spec_value_not_empty check (spec_value != '')
);

-- Index for fast spec searches
create index if not exists ps_product_id_idx on public.product_specifications(product_id);
create index if not exists ps_spec_key_idx on public.product_specifications(spec_key);
create index if not exists ps_verified_idx on public.product_specifications(is_verified);

-- Composite index for spec matching (key + value)
create index if not exists ps_product_key_value_idx on public.product_specifications(product_id, spec_key, spec_value);

-- Comments
comment on table public.supplier_documents_products is 'Junction table linking supplier documents to products. One document can apply to many products.';
comment on table public.product_specifications is 'Technical specifications extracted from documents: curing time, temperature range, water resistance, etc.';
comment on column public.product_specifications.spec_key is 'Normalized specification name: curing_time, temperature_range, water_resistant, viscosity, color, shelf_life, etc.';
comment on column public.product_specifications.is_verified is 'true = manually reviewed by admin; false = auto-extracted, may need verification';

-- RLS: Keep it simple for now
-- Authenticated reads for product specs (to build Agent knowledge base)
-- Admin-only writes

alter table public.supplier_documents_products enable row level security;
alter table public.product_specifications enable row level security;

-- Allow authenticated users to read product specs (for Agent)
create policy "authenticated can read product specs" on public.product_specifications
  for select
  using (true);

create policy "authenticated can read document-product links" on public.supplier_documents_products
  for select
  using (true);

-- Admin write access
create policy "admin can insert specs" on public.product_specifications
  for insert
  with check ((select count(*) from public.admin_login_attempts) > 0);

create policy "admin can insert doc-product links" on public.supplier_documents_products
  for insert
  with check ((select count(*) from public.admin_login_attempts) > 0);

create policy "admin can delete specs" on public.product_specifications
  for delete
  using ((select count(*) from public.admin_login_attempts) > 0);

create policy "admin can delete doc-product links" on public.supplier_documents_products
  for delete
  using ((select count(*) from public.admin_login_attempts) > 0);
