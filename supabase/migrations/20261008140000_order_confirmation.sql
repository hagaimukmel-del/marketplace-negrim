-- A fuller supplier confirmation (stage 2 of the 2026-10-08 plan).
--
-- order_items.unavailable: the supplier marks a line it cannot supply. The
-- line and its snapshot price stay as ordered (amounts are snapshots and are
-- never rewritten); the confirmed amount on the order already says what will
-- be supplied, and this says which line is missing.
--
-- orders.expected_delivery_on: the date the supplier commits to when confirming.
--
-- A rejection needs no column: status 'cancelled' with the reason in
-- orders.supplier_note.
--
-- Written and read by server code only (api/supplier/orders, lib/app/
-- orders-server). Both sides tolerate the columns being absent.

alter table public.order_items
  add column if not exists unavailable boolean not null default false;

alter table public.orders
  add column if not exists expected_delivery_on date;
