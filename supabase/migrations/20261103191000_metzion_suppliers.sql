-- Suppliers on המציאון.
--
-- Until now only a carpenter could post. A supplier has the same things to pass
-- on: end-of-line stock, a returned machine, a damaged carton sold cheap. They
-- post from their own console (/supplier/metzion) and the listing sits on the
-- same board, marked as a supplier's. The deal is still direct between the two
-- sides: no payment, no delivery, no chat.
--
-- A listing has exactly one owner: a carpenter or a supplier. carpenter_id
-- stops being required, and a check keeps one of the two set. Every existing
-- row has a carpenter, so the check holds on apply.

alter table public.metzion_listings
  add column if not exists supplier_id uuid references public.suppliers(id) on delete cascade;

alter table public.metzion_listings
  alter column carpenter_id drop not null;

alter table public.metzion_listings
  drop constraint if exists metzion_one_owner;
alter table public.metzion_listings
  add constraint metzion_one_owner check ((carpenter_id is null) <> (supplier_id is null));

create index if not exists metzion_listings_supplier_idx
  on public.metzion_listings (supplier_id) where supplier_id is not null;

comment on column public.metzion_listings.supplier_id is
  'Set when a supplier posted the listing from /supplier/metzion. Exactly one of carpenter_id and supplier_id is set (metzion_one_owner).';
