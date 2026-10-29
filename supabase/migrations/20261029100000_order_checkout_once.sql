-- One checkout makes at most one purchase order per supplier.
--
-- The cart now sends the same checkout_id with every attempt at one send, and
-- POST /api/orders returns the existing orders when it sees that id again. Two
-- attempts that race past that first look both reach the insert; this index
-- lets only one of them write, and the other reads the winner's orders.
--
-- Existing rows already satisfy it: older orders got checkout_id = id, and a
-- split checkout has one order per supplier.
create unique index if not exists orders_checkout_supplier_key
  on public.orders (checkout_id, supplier_id);
