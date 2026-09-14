-- A supplier gets a way in.
--
-- Until now a supplier could register and be approved and then do nothing:
-- there was no login, so the console built for them was unreachable. Approving
-- somebody and leaving them at a locked door is worse than not approving them.
--
-- The same shape the carpenters use, for the same reason. A supplier will not
-- create a password to update a price list, and waiting on an account system
-- means the catalogue stays one supplier deep. 22 hex characters is 88 bits —
-- short enough to paste into a message, far beyond guessing.
--
-- This is a credential, so it is treated as one: it is only ever shown to the
-- operator sending it, it can be reissued if it leaks, and the session it
-- mints is checked on the server for every page it protects.

alter table public.suppliers
  add column if not exists token varchar
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 22);

-- Existing rows predate the default.
update public.suppliers
   set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 22)
 where token is null;

alter table public.suppliers
  alter column token set not null;

create unique index if not exists suppliers_token_idx on public.suppliers (token);

comment on column public.suppliers.token is
  'The supplier''s way in, exchanged once for a signed session cookie. Reissue it if it leaks - nothing else identifies them.';
