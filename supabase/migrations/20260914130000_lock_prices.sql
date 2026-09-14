-- Prices leave the public key's reach.
--
-- `supplier_offers` carried one policy: public SELECT on anything active. That
-- was correct while the catalogue was fetched in the browser — the page could
-- not have rendered without it.
--
-- The catalogue is now read on the server, which decides per visitor whether a
-- price is included at all. Nothing in a browser needs this table any more, and
-- while the policy stands the gating is only half real: the page withholds
-- prices and the database hands them to anyone who asks it directly.
--
-- Dropping it leaves `supplier_offers` in the same state as `orders` and
-- `carpenters` — RLS on, no policy, reachable only through server code holding
-- the service role.
--
-- Run only after the server-rendered catalogue is deployed and confirmed.
-- Applying this first takes the live catalogue down with it.
--
-- Verify before applying — this must return rows through the service role and
-- nothing through the public key:
--   select count(*) from supplier_offers where is_active;

drop policy if exists "Public read of active offers" on public.supplier_offers;

-- `products` keeps its public read. What a thing IS stays open to everyone —
-- that is the catalogue a stranger is allowed to browse, and the reason to
-- register is that it has no prices on it.
