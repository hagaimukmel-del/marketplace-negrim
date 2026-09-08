-- =============================================================================
-- 0007 · WHERE A CARPENTER CAME FROM
-- =============================================================================
-- Carpenters could only ever be added by the operator pasting a list, so there
-- was nothing to distinguish. With self sign-up there is: a name typed by
-- somebody who found the site is worth less trust than one off the WhatsApp
-- list, and is worth calling before it is counted as a customer.
-- =============================================================================

alter table public.carpenters
  add column if not exists source varchar not null default 'import'
    check (source in ('import', 'self'));

comment on column public.carpenters.source is
  'import = added by the operator from their own list. self = signed up through /join.';

create index if not exists idx_carpenters_source on public.carpenters using btree (source);
