-- A supplier the operator opens himself.
--
-- `source` allowed 'seed' (the original row) and 'self' (someone filled in the
-- registration form). Neither describes the case that actually matters for the
-- next few months: the operator recruits a supplier by phone and sets them up
-- in the console. Those are approved by definition - he created them - and it
-- is worth being able to tell them apart from inbound applications later.

alter table public.suppliers
  drop constraint if exists suppliers_source_check;

alter table public.suppliers
  add constraint suppliers_source_check
  check (source in ('seed', 'self', 'admin'));
