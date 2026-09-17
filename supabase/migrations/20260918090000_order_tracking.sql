-- What the new carpenter screens need from an order, and nothing more.
--
--   * a short number a person can say on the phone: #1048, not ORD-1789560108249
--   * when each step happened, so the timeline shows real times — and shows
--     "בהכנה" / "בדרך" as not marked when a supplier skipped them, instead of
--     pretending they happened
--   * that the carpenter has seen a changed confirmed amount, so the home screen
--     stops asking once it has been looked at
--   * who marked an order as received: the supplier, or the carpenter
--
-- The step times are set by a trigger on the status change itself, so every
-- writer — the supplier console, the emailed confirm link, the operator console,
-- the carpenter — records them the same way without each remembering to.

create sequence if not exists public.orders_short_number_seq start with 1001;

alter table public.orders
  add column if not exists short_number bigint,
  add column if not exists carpenter_seen_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_by text check (delivered_by is null or delivered_by in ('supplier', 'carpenter', 'operator'));

-- Existing orders get numbers in the order they were placed.
with numbered as (
  select id from public.orders where short_number is null order by created_at, id
)
update public.orders o
   set short_number = nextval('public.orders_short_number_seq')
  from numbered n
 where o.id = n.id;

alter table public.orders alter column short_number set default nextval('public.orders_short_number_seq');
alter table public.orders alter column short_number set not null;
alter sequence public.orders_short_number_seq owned by public.orders.short_number;
create unique index if not exists orders_short_number_key on public.orders (short_number);

comment on column public.orders.short_number is 'What people say and type: #1048. order_number stays the internal reference.';
comment on column public.orders.carpenter_seen_at is 'When the carpenter acknowledged a confirmed amount that differs from what they sent.';
comment on column public.orders.processing_at is 'When the supplier marked the order in preparation. Optional step; null when skipped.';
comment on column public.orders.shipped_at is 'When the supplier marked the order on its way. Optional step; null when skipped.';
comment on column public.orders.delivered_at is 'When the order was marked received.';
comment on column public.orders.delivered_by is 'Who marked it received: supplier, carpenter or operator.';

-- Orders already past a step keep what is known: nothing. A missing time is
-- shown as not marked, which is the truth for them.

create or replace function public.order_status_timestamps()
returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' and new.confirmed_at is null then new.confirmed_at := now(); end if;
    if new.status = 'processing' and new.processing_at is null then new.processing_at := now(); end if;
    if new.status = 'shipped' and new.shipped_at is null then new.shipped_at := now(); end if;
    if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_timestamps on public.orders;
create trigger orders_status_timestamps
  before update of status on public.orders
  for each row execute function public.order_status_timestamps();
