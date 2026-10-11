-- "מוצר השבוע": one paid promotion slot a week (T-024, owner 2026-10-08).
--
-- A supplier books a week for one of their products in the supplier console;
-- the operator approves it in /admin/promotions. While approved, the product
-- is shown with a "מוצר השבוע" label at the top of the carpenter home, at the
-- top of its category, and first in the agent's results for that field.
-- The price (690 ₪ excl. VAT, lib/supplier-plans.ts) is snapshotted on the
-- row. Billing happens outside the site, like the subscription (CLAUDE.md §5):
-- nothing here charges anyone.
--
-- One live booking per week: a week is taken by a request or an approval, and
-- frees up again when it is rejected or cancelled. Weeks start on Sunday, the
-- Israeli working week.
--
-- promo_events counts what the slot did: views and add-to-cart clicks on the
-- promoted card, and views in the agent. Orders are not stored here; they are
-- read from order_items for that product and supplier during the week.
--
-- Both tables have RLS on and no policy: server code with the service role
-- only, like orders. Read by src/lib/promo.ts, which tolerates the tables being
-- absent so the site keeps working before this migration is applied.

create table if not exists public.promo_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'requested',
  price_excl_vat numeric(10, 2) not null,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint promo_weeks_status check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  constraint promo_weeks_sunday check (extract(dow from week_start) = 0),
  constraint promo_weeks_price check (price_excl_vat >= 0)
);

create unique index if not exists promo_weeks_one_live_per_week
  on public.promo_weeks (week_start)
  where status in ('requested', 'approved');

create index if not exists promo_weeks_supplier_idx on public.promo_weeks (supplier_id, week_start desc);

alter table public.promo_weeks enable row level security;

create table if not exists public.promo_events (
  id bigint generated always as identity primary key,
  promo_week_id uuid not null references public.promo_weeks(id) on delete cascade,
  kind text not null,
  placement text not null,
  carpenter_id uuid references public.carpenters(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint promo_events_kind check (kind in ('view', 'add')),
  constraint promo_events_placement check (placement in ('home', 'category', 'agent'))
);

create index if not exists promo_events_week_idx on public.promo_events (promo_week_id, kind);

alter table public.promo_events enable row level security;
