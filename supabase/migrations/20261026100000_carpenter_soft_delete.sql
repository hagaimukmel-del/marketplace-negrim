-- Deleting a carpentry from the admin console, with three months to undo it.
--
-- Until now "מחק" removed the row for good: everything hanging off it went by
-- cascade (quotes, messages, Metzion listings, the work profile) and the only
-- way back was to sign them up again. Now the operator's delete only marks the
-- row, and the row is removed for real three months later by the daily cron
-- (/api/cron/outbox → lib/carpenter-deletion-server.ts).
--
--   deleted_at            when the operator deleted it; null = not deleted
--   deleted_by            who did ('admin' while the console has one passphrase)
--   active_before_delete  is_active at the moment of deletion, so restoring a
--                         carpentry that was blocked brings it back blocked
--
-- A deleted carpentry is also is_active = false. Every way in (the personal
-- link, login code, Google, /join, prices, orders, the boards) already refuses
-- an inactive row, so deletion reuses those gates instead of adding a second
-- set; the check below makes the database refuse a deleted row that is active.
--
-- Additive. Code reading these columns tolerates them being absent.

alter table public.carpenters add column if not exists deleted_at timestamptz;
alter table public.carpenters add column if not exists deleted_by text;
alter table public.carpenters add column if not exists active_before_delete boolean;

alter table public.carpenters drop constraint if exists carpenters_deleted_inactive_check;
alter table public.carpenters add constraint carpenters_deleted_inactive_check
  check (deleted_at is null or is_active = false);

create index if not exists carpenters_deleted_at_idx
  on public.carpenters (deleted_at) where deleted_at is not null;
