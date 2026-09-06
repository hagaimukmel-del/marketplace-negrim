-- =============================================================================
-- 0003 · CATALOGUE REPAIR
-- =============================================================================
-- The 62 rows in products came from /api/sync-products, whose hand-rolled CSV
-- parser damaged them in two ways. Both were confirmed by re-reading the source
-- Google Sheet (32 data rows, all of them clean):
--
--   1. COLUMN SHIFT. On one run the parser mis-split a row containing a quoted
--      comma and every column after it slid by one, so values[2] read the
--      *category* (column 1) instead of the Hebrew name (column 2). That run
--      produced 32 rows whose name_he and name_en are both a category label.
--      The counts match the sheet exactly:
--          מוצרים משלימים 13, דבקים למכונות קנטים 8,
--          תוספים של חברת RIEPE למתזים 5, חומרי ניקוי ותחזוקה 4,
--          דבקים על בסיס מים 2
--
--   2. TRUNCATED PRICES. Prices are written as "1,250₪". The parser stripped
--      the ₪ but not the thousands separator, and parseFloat('1,250') is 1.
--      Eight products priced 1,200-1,450 ILS were stored as 1.00 ILS.
--
-- The real names and prices were never written to the database, so they cannot
-- be recovered from it — the sheet is the only source. This migration therefore
-- clears the damaged rows and relies on the corrected sync to rebuild them.
-- docs/db-backup/products.json holds the pre-repair state.
--
-- RUN THE SYNC AFTER APPLYING THIS: GET /api/sync-products
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. categories, taken from the sheet's own category column
-- -----------------------------------------------------------------------------

insert into public.categories (name_he, is_active)
select v.name_he, true
from (values
  ('דבקים למכונות קנטים'),
  ('דבקים על בסיס מים'),
  ('תוספים של חברת RIEPE למתזים'),
  ('חומרי ניקוי ותחזוקה'),
  ('מוצרים משלימים')
) as v(name_he)
where not exists (
  select 1 from public.categories c where c.name_he = v.name_he
);

-- -----------------------------------------------------------------------------
-- 2. every product belongs to the one supplier on the platform
-- -----------------------------------------------------------------------------

update public.products
set supplier_id = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'
where supplier_id is null
  and exists (
    select 1 from public.suppliers s
    where s.id = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a'
  );

-- -----------------------------------------------------------------------------
-- 3. drop the column-shifted rows
-- -----------------------------------------------------------------------------
-- A product whose Hebrew name is exactly a category name is parser damage, not
-- a product. Matching against public.categories rather than a hard-coded list
-- keeps this correct if the sheet gains a category before this is applied.

delete from public.supplier_products
where product_id in (
  select p.id from public.products p
  join public.categories c on c.name_he = p.name_he
);

delete from public.products p
using public.categories c
where c.name_he = p.name_he;

-- -----------------------------------------------------------------------------
-- 4. collapse any remaining exact duplicates, keeping the most recent row
-- -----------------------------------------------------------------------------
-- Re-running the old sync inserted rather than upserted, so the same product
-- can appear more than once. The unique constraint below needs these gone.

with ranked as (
  select id,
         row_number() over (
           partition by supplier_id, name_he, coalesce(name_en, '')
           order by updated_at desc nulls last, created_at desc nulls last
         ) as rn
  from public.products
)
delete from public.supplier_products
where product_id in (select id from ranked where rn > 1);

with ranked as (
  select id,
         row_number() over (
           partition by supplier_id, name_he, coalesce(name_en, '')
           order by updated_at desc nulls last, created_at desc nulls last
         ) as rn
  from public.products
)
delete from public.products
where id in (select id from ranked where rn > 1);

-- -----------------------------------------------------------------------------
-- 5. a place for a real product code
-- -----------------------------------------------------------------------------
-- The sheet has no SKU column today, so the sync matches on the name pair
-- below. Add a SKU column to the sheet and this becomes the better key.

alter table public.products
  add column if not exists sku varchar;

create unique index if not exists products_supplier_sku_key
  on public.products (supplier_id, sku)
  where sku is not null;

-- -----------------------------------------------------------------------------
-- 6. the natural key the corrected sync upserts on
-- -----------------------------------------------------------------------------
-- name_he alone is not unique: the sheet lists "קלינר Q1924 ניקוי EVA" twice,
-- once as CLEANER Q1924 White and once as CLEANER Q1924 White (Small).
-- name_en alone is not unique either. The pair is.
--
-- name_en is backfilled first so the index has no NULLs to treat as distinct,
-- and so PostgREST can target it by column list from .upsert({ onConflict }).

update public.products
set name_en = name_he
where name_en is null or btrim(name_en) = '';

create unique index if not exists products_supplier_name_key
  on public.products (supplier_id, name_he, name_en);
