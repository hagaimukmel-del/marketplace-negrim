-- Supplier Knowledge System: Document Storage
--
-- Allows suppliers to upload and link:
-- - TDS (Technical Data Sheet)
-- - SDS (Safety Data Sheet)
-- - Product catalogs
-- - Specifications
-- - Installation guides
-- - Video tutorials
-- - FAQs
-- - Compatibility tables
--
-- Organized by supplier_id for easy permission scoping.

create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  -- File metadata
  file_name text not null,                -- "TDS_jowat_258.60.pdf"
  file_path text not null,                -- path in Supabase Storage
  file_size bigint not null,              -- bytes
  file_type text not null,                -- "application/pdf", "image/png", etc

  -- Classification
  document_type text not null,            -- TDS, SDS, catalog, specification, guide, tutorial, faq, compatibility
  language text not null default 'he',    -- he, en, etc

  -- Content
  description text,                       -- "Jowat 258.60 Technical Data Sheet"
  categories text[] default array[]::text[],  -- which product categories this applies to

  -- Metadata
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  indexed_at timestamptz,                -- when prepared for semantic search
  is_active boolean not null default true,

  -- Constraints
  constraint file_name_not_empty check (file_name != ''),
  constraint file_path_not_empty check (file_path != ''),
  constraint valid_document_type check (document_type in ('TDS', 'SDS', 'catalog', 'specification', 'guide', 'tutorial', 'faq', 'compatibility')),
  constraint file_size_positive check (file_size > 0)
);

-- Index for fast lookup by supplier
create index if not exists supplier_documents_supplier_id_idx on public.supplier_documents(supplier_id);

-- Index for active documents
create index if not exists supplier_documents_is_active_idx on public.supplier_documents(is_active);

-- Index for document type searches
create index if not exists supplier_documents_document_type_idx on public.supplier_documents(document_type);

-- Comments for clarity
comment on table public.supplier_documents is 'Supplier documentation: TDS, SDS, catalogs, specs, guides. Foundation for Product Knowledge system.';
comment on column public.supplier_documents.document_type is 'TDS=Technical Data Sheet, SDS=Safety Data Sheet, catalog=Product Catalog, specification=Product Specifications, guide=Installation/Usage Guide, tutorial=Video or instructional content, faq=Frequently Asked Questions, compatibility=Compatibility/Matching Tables.';
comment on column public.supplier_documents.file_path is 'Path in Supabase Storage bucket: suppliers/{supplier_id}/{file_name}';
comment on column public.supplier_documents.categories is 'Array of product categories this document applies to (e.g., ARRAY[''adhesives'', ''woodworking''])';
comment on column public.supplier_documents.indexed_at is 'When document was prepared for semantic search (null = not yet indexed)';

-- RLS: Only authenticated users can read their own supplier's documents
-- Suppliers can only see their own documents
-- Admins can see all

alter table public.supplier_documents enable row level security;

-- Public read: not yet (future: when authenticated as carpenter)
-- For now: documents are internal to Nagarim

create policy "Suppliers can view own documents" on public.supplier_documents
  for select
  using (
    -- Supplier sees their own supplier's documents
    (select exists(
      select 1 from public.suppliers
      where id = supplier_documents.supplier_id
        and business_id = auth.jwt() ->> 'business_id'
    ))
    -- OR admin (check exists in admin_login_attempts)
    OR (select exists(select 1 from public.admin_login_attempts limit 1))
  );

create policy "Suppliers can insert own documents" on public.supplier_documents
  for insert
  with check (
    -- Supplier can only insert to their own supplier_id
    (select exists(
      select 1 from public.suppliers
      where id = supplier_id
        and business_id = auth.jwt() ->> 'business_id'
    ))
  );

create policy "Suppliers can update own documents" on public.supplier_documents
  for update
  using (
    (select exists(
      select 1 from public.suppliers
      where id = supplier_id
        and business_id = auth.jwt() ->> 'business_id'
    ))
  )
  with check (
    (select exists(
      select 1 from public.suppliers
      where id = supplier_id
        and business_id = auth.jwt() ->> 'business_id'
    ))
  );

create policy "Suppliers can delete own documents" on public.supplier_documents
  for delete
  using (
    (select exists(
      select 1 from public.suppliers
      where id = supplier_id
        and business_id = auth.jwt() ->> 'business_id'
    ))
  );
