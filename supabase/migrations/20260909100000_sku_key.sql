-- =============================================================================
-- 0008 · SKU AS THE PRODUCT KEY
-- =============================================================================
-- Products are matched on the pair (name_he, name_en) today, which means a
-- supplier who corrects a typo in a product name creates a second product
-- instead of updating the first. Every import path inherits that, so a
-- spreadsheet uploaded twice would duplicate the catalogue rather than refresh
-- it. The SKU is the stable identity.
--
-- Migration 0003 created the index as partial — `where sku is not null` — which
-- Postgres accepts but PostgREST cannot target from an upsert, because
-- ON CONFLICT needs the index's predicate restated and the API has no way to
-- express it. A plain unique index does the same job here: Postgres treats
-- NULLs as distinct, so any number of products may still have no SKU while
-- those that do have one are unique per supplier.
-- =============================================================================

drop index if exists products_supplier_sku_key;

create unique index if not exists products_supplier_sku_key
  on public.products (supplier_id, sku);

comment on column public.products.sku is
  'Supplier catalogue number. Unique per supplier. When present it is the key an '
  'import matches on: a repeated SKU overwrites the existing product, and the '
  'importer reports every row it overwrote.';
