-- Where a carpentry's deliveries go.
--
-- Registration asked for a city and nothing else, so the first order stopped to
-- collect a street address and every order after it asked again. A carpenter
-- typing their own address repeatedly is friction we put there ourselves.
--
-- It is the DEFAULT, not a constraint: the address on an order is still that
-- order's own, because a pallet sometimes goes to a site rather than the
-- workshop, and on self-collection there is no address at all.

alter table public.carpenters
  add column if not exists address text;

comment on column public.carpenters.address is
  'Default delivery address, pre-filled at checkout. The order keeps its own copy, which is what actually shipped.';

-- Anyone who registered before this had to type an address at checkout. Take
-- the most recent one they used rather than asking a second time.
update public.carpenters c
   set address = latest.address,
       city    = coalesce(c.city, latest.city)
  from (
    select distinct on (carpenter_id) carpenter_id, address, city
      from public.orders
     where carpenter_id is not null
       and address is not null
     order by carpenter_id, created_at desc
  ) as latest
 where latest.carpenter_id = c.id
   and c.address is null;
