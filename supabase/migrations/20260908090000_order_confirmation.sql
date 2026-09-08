-- =============================================================================
-- 0006 · SUPPLIER CONFIRMATION
-- =============================================================================
-- An order in this system is a purchase order. The supplier fulfils it and
-- invoices the carpenter directly, so the amount that actually changes hands is
-- decided by the supplier, not by what the basket totalled when Send was
-- pressed: quantities get adjusted, an item is out of stock, a negotiated price
-- applies.
--
-- Without somewhere to record that, `subtotal_excl_vat` silently doubles as
-- both "what was asked for" and "what was supplied", and any commission
-- calculated from it disagrees with the supplier's own invoice on every order.
-- These columns keep the two apart.
-- =============================================================================

alter table public.orders
  add column if not exists confirmed_subtotal_excl_vat numeric
    check (confirmed_subtotal_excl_vat >= 0);

alter table public.orders
  add column if not exists confirmed_at timestamptz;

alter table public.orders
  add column if not exists supplier_note text;

comment on column public.orders.subtotal_excl_vat is
  'What the carpenter submitted. Never revised after the fact.';
comment on column public.orders.confirmed_subtotal_excl_vat is
  'What the supplier confirmed it will supply and invoice. The basis for any '
  'commission — never the submitted figure.';
comment on column public.orders.supplier_note is
  'Why the confirmed amount differs, when it does. Shown to the carpenter.';

-- Orders are worked through newest-first on the operator screen, and the open
-- ones are the only ones that matter day to day.
create index if not exists idx_orders_status_created
  on public.orders using btree (status, created_at desc);
