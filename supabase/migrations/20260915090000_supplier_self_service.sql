-- Suppliers run their own listing.
--
-- The supplier console could show a supplier their orders and their prices and
-- nothing else: no way to add a product, attach a photo, set payment terms or
-- change their own phone number. Every one of those was a message to the
-- operator. Two columns make the rest of it possible.

-- Which payment terms a supplier works on. Chosen from a fixed list in the app,
-- because free text here would never be comparable across suppliers.
alter table public.suppliers
  add column if not exists payment_terms text[] not null default '{}';

comment on column public.suppliers.payment_terms is
  'Terms this supplier accepts, picked from a fixed list (שוטף+30, מזומן במסירה ...). The supplier sets them and invoices the carpenter directly.';

-- Who created a product. A product is shared by every supplier who sells it,
-- so only its creator may rename it, change its unit or its photo; everyone
-- else edits only their own offer - price, stock, pack. Null for products that
-- came from the sheet or the console.
alter table public.products
  add column if not exists created_by_supplier_id uuid
    references public.suppliers(id) on delete set null;

create index if not exists products_created_by_supplier_idx
  on public.products (created_by_supplier_id);

comment on column public.products.created_by_supplier_id is
  'The supplier who created this product, and the only one who may edit its shared fields. Null when it came from the sheet or the operator.';
