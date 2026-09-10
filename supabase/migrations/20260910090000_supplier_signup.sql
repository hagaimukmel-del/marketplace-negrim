-- Supplier sign-up and approval.
--
-- A supplier could not register: the one row in `suppliers` was inserted by
-- hand. Registration means the table now holds applications as well as trading
-- suppliers, so it needs to say which is which.
--
-- `is_verified` already existed but is a boolean, and a boolean cannot tell a
-- rejected application apart from one nobody has looked at yet. An explicit
-- status does, and it is the column the console filters on.

alter table public.suppliers
  add column if not exists status text not null default 'pending',
  add column if not exists source text not null default 'self',
  add column if not exists phone_key text,
  add column if not exists sells_note text,
  add column if not exists decided_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suppliers_status_check') then
    alter table public.suppliers
      add constraint suppliers_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'suppliers_source_check') then
    alter table public.suppliers
      add constraint suppliers_source_check
      check (source in ('seed', 'self'));
  end if;
end $$;

-- The supplier already trading was created by hand, not through the form.
update public.suppliers
   set status = 'approved',
       source = 'seed',
       decided_at = coalesce(decided_at, created_at)
 where is_verified is true
    or id = '6048c39d-e5c1-497d-91cd-04e6bdf6e27a';

-- The last nine digits, so 050-123-4567, 0501234567 and +972501234567 are one
-- business. `phone` keeps whatever was typed, because that is what gets read
-- back to a human; `phone_key` is only for matching. Same rule as carpenters.
update public.suppliers
   set phone_key = right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)
 where phone is not null
   and phone_key is null;

-- Partial, because a row imported without a phone must still be allowed.
create unique index if not exists suppliers_phone_key_idx
  on public.suppliers (phone_key)
  where phone_key is not null;

create index if not exists suppliers_status_idx on public.suppliers (status);

-- RLS stays as the lockdown left it: enabled, no policy, so this table is
-- reachable only through server code holding the service role. Registration
-- writes go through /api/supplier-join, which validates before inserting.
