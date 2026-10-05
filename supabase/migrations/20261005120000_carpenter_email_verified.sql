-- A carpentry's email is confirmed when a link mailed to it is opened
-- (/carpenter/enter/[token]?v=...). Until then its orders do not reach
-- suppliers: /api/orders refuses them. Changing the email clears it.
alter table public.carpenters
  add column if not exists email_verified_at timestamptz;

comment on column public.carpenters.email_verified_at is
  'When a link mailed to carpenters.email was opened. Null = orders are held until confirmed.';

-- Carpentries that exist today keep ordering as before (offer links included).
-- One without an email that adds one later has to confirm it: the profile
-- route clears this column whenever the address changes.
update public.carpenters
   set email_verified_at = coalesce(terms_accepted_at, created_at, now())
 where email_verified_at is null;
