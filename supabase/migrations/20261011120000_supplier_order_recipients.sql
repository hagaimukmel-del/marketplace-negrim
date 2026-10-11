-- More people who receive a supplier's new orders (plan stage 6).
--
-- A warehouse or a bookkeeper should see incoming orders without being handed
-- the console's sign-in link, which would let them change prices. They get a
-- copy of the new-order email only: no confirm button, no sign-in. The main
-- address (suppliers.email) stays the one that confirms and gets messages.
--
-- Up to five addresses, lower-cased by the profile route before saving.
--
-- Read by src/lib/order-recipients.ts, which tolerates the column being absent
-- so the app keeps working on a database this migration has not reached yet.

alter table public.suppliers
  add column if not exists order_cc_emails text[] not null default '{}';

alter table public.suppliers drop constraint if exists suppliers_order_cc_emails_max;
alter table public.suppliers
  add constraint suppliers_order_cc_emails_max check (cardinality(order_cc_emails) <= 5);
