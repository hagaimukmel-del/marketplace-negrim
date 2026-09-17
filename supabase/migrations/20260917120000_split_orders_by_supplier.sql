-- One cart becomes one purchase order per supplier.
--
-- Until now an order held every line of the cart, whoever sold it. But an order
-- has one status, one confirmed amount and one supplier note, so an order with
-- two suppliers on it could not be confirmed by either of them: the console and
-- the emailed link both refused it and sent it to the operator.
--
-- From here each order is addressed to exactly one supplier. The orders created
-- from the same checkout share a checkout_id, so the carpenter still sees what
-- they sent together, and reports can count a checkout once.

alter table public.orders
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists checkout_id uuid;

comment on column public.orders.supplier_id is
  'The one supplier this purchase order is addressed to. Every line on it is theirs. Null only on orders from before the split that held more than one supplier.';
comment on column public.orders.checkout_id is
  'Shared by the purchase orders created from one checkout. Equal to the order id when the checkout went to a single supplier.';

-- Existing orders: addressed to their supplier when all their lines have one.
update public.orders o
   set supplier_id = s.supplier_id
  from (
    select order_id, (array_agg(distinct supplier_id))[1] as supplier_id
      from public.order_items
     where supplier_id is not null
     group by order_id
    having count(distinct supplier_id) = 1
  ) s
 where o.id = s.order_id
   and o.supplier_id is null;

update public.orders set checkout_id = id where checkout_id is null;

create index if not exists orders_supplier_idx on public.orders (supplier_id, created_at desc);
create index if not exists orders_checkout_idx on public.orders (checkout_id);

-- A line can only sit on an order addressed to the company that sells it.
-- Enforced here, not only in the route that builds orders, so no other writer
-- can put a second supplier's line back onto someone else's purchase order.
create or replace function public.order_item_matches_order_supplier()
returns trigger
language plpgsql as $$
declare
  v_supplier uuid;
begin
  select supplier_id into v_supplier from public.orders where id = new.order_id;
  if v_supplier is not null and new.supplier_id is distinct from v_supplier then
    raise exception 'order % is addressed to supplier %, not %', new.order_id, v_supplier, new.supplier_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists order_items_supplier_matches on public.order_items;
create trigger order_items_supplier_matches
  before insert or update of supplier_id, order_id on public.order_items
  for each row execute function public.order_item_matches_order_supplier();
