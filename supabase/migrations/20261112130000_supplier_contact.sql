-- WhatsApp and call buttons to the supplier on the product and supplier pages
-- (product review 2026-11-12: contact is the main action, a purchase order the
-- other option). Shown to registered carpentries only.
--
-- 1. The supplier chooses in its console whether carpentries reach it by
--    WhatsApp (a mobile) and by call (any phone). Both optional, and the
--    business phone is never used for this (owner, 2026-11-12): without them
--    carpentries write in the site, as before.
--
-- 2. contact_clicks (20261025150000) gets where the press happened and about
--    which product, so a supplier can be shown how many carpentries reached it
--    from its page and from each product. Presses on an order or a quote keep
--    source null: their order_id / quote_request_id already says where.
--
-- Additive only. Before this migration is applied no supplier has buttons and
-- the pages keep the in-site question. RLS stays as it was: suppliers and
-- contact_clicks are server only.

alter table public.suppliers
  add column if not exists contact_phone        text,
  add column if not exists whatsapp_phone       text,
  add column if not exists contact_confirmed_at timestamptz;

alter table public.contact_clicks
  add column if not exists source     text,
  add column if not exists product_id uuid references public.products (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contact_clicks_source_check') then
    alter table public.contact_clicks
      add constraint contact_clicks_source_check
      check (source is null or source in ('product', 'supplier'));
  end if;
end $$;

create index if not exists contact_clicks_product_idx on public.contact_clicks (product_id, created_at desc)
  where product_id is not null;
