-- What each supplier owes the platform and what they paid (admin report
-- /admin/billing, owner 2026-11-09).
--
-- Two charges exist (CLAUDE.md §5 Revenue model): the supplier subscription
-- (350 ₪ a month excl. VAT, lib/supplier-plans.ts) and "מוצר השבוע" weeks
-- (price snapshotted on promo_weeks). Billing happens outside the site: these
-- tables only record what the operator agreed and what money arrived, so the
-- report can show owed / paid / balance per month. Nothing here charges anyone,
-- and none of it touches orders, which stay purchase orders between carpenter
-- and supplier.
--
-- supplier_billing: one row per supplier, only when the subscription differs
-- from the default. Without a row, an approved supplier owes the list price
-- from the month billing starts (January 2027) or the month they were
-- approved, whichever is later (lib/billing-rules.ts). monthly_excl_vat = 0
-- marks a supplier who pays nothing (the operator's own business, a free
-- founding period). free_until_month gives a free period: nothing is owed up
-- to and including that month, the plan runs as set after it. Months are
-- stored as the first day of the month.
--
-- supplier_payments: money received, entered by the operator. A payment can
-- cover several months (paid ahead: 4,200 for a year covers 12 months, 350
-- each), and an installment plan is one row per installment, numbered. The
-- amount is excl. VAT so it compares with what is owed.
--
-- Both tables: RLS on, no policy. Service role only, like orders.

create table if not exists public.supplier_billing (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  monthly_excl_vat numeric(10, 2) not null,
  starts_month date not null,
  ends_month date,
  free_until_month date,
  note text,
  updated_at timestamptz not null default now(),
  constraint supplier_billing_monthly check (monthly_excl_vat >= 0),
  constraint supplier_billing_starts_first check (extract(day from starts_month) = 1),
  constraint supplier_billing_ends_first check (ends_month is null or extract(day from ends_month) = 1),
  constraint supplier_billing_free_first check (free_until_month is null or extract(day from free_until_month) = 1),
  constraint supplier_billing_range check (ends_month is null or ends_month >= starts_month)
);

alter table public.supplier_billing enable row level security;

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  kind text not null,
  amount_excl_vat numeric(10, 2) not null,
  paid_on date not null,
  covers_from date not null,
  covers_months integer not null default 1,
  installment_no integer,
  installments_total integer,
  method text,
  note text,
  created_at timestamptz not null default now(),
  constraint supplier_payments_kind check (kind in ('subscription', 'promo')),
  constraint supplier_payments_amount check (amount_excl_vat > 0),
  constraint supplier_payments_covers_first check (extract(day from covers_from) = 1),
  constraint supplier_payments_covers_months check (covers_months between 1 and 24),
  constraint supplier_payments_installment check (
    (installment_no is null and installments_total is null)
    or (installment_no between 1 and installments_total and installments_total between 2 and 36)
  ),
  constraint supplier_payments_method check (method is null or method in ('transfer', 'card', 'check', 'cash', 'other'))
);

create index if not exists supplier_payments_supplier_idx on public.supplier_payments (supplier_id, covers_from);

alter table public.supplier_payments enable row level security;
