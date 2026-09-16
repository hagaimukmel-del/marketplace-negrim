-- המציאון: a board of carpenters for carpenters.
--
-- A carpenter posts material, hardware, a product or a machine they no longer
-- need, and another carpenter takes it — for a price or for free. The site only
-- connects them: no payment, no delivery, no chat. Contact is WhatsApp or a
-- call, and the phone is revealed on a tap, to registered carpenters only.
--
-- Deliberately its own table, not products: there is no supplier, no SKU, no
-- stock and no catalogue matching here.

create table if not exists public.metzion_listings (
  id             uuid primary key default gen_random_uuid(),
  carpenter_id   uuid not null references public.carpenters(id) on delete cascade,

  title          text not null check (char_length(title) between 3 and 120),
  description    text check (description is null or char_length(description) <= 1500),
  category       text not null check (category in ('raw', 'hardware', 'products', 'machines', 'other')),
  condition      text not null check (condition in ('new', 'new_boxed', 'used', 'surplus', 'finished', 'other')),
  deal_type      text not null check (deal_type in ('sale', 'free')),
  quantity       numeric not null check (quantity > 0),
  unit           text not null default 'יח׳',
  price_per_unit numeric check (price_per_unit is null or price_per_unit > 0),

  -- Prefilled from the carpenter, editable: the person who posts is not always
  -- the one who answers the phone.
  contact_name   text not null,
  contact_phone  text not null,
  city           text not null,
  regions        text[] not null default '{}',

  images         text[] not null check (array_length(images, 1) between 1 and 6),

  -- Sold is not deleted. The sold history is the one dataset nobody else has:
  -- what second-hand machines and surplus boards actually go for.
  status         text not null default 'active' check (status in ('active', 'sold', 'removed')),
  removed_reason text,
  expires_at     timestamptz not null default (now() + interval '60 days'),
  sold_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint metzion_price_matches_deal check (
    (deal_type = 'free' and price_per_unit is null) or
    (deal_type = 'sale' and price_per_unit is not null)
  )
);

-- Expiry is a filter at query time, not a job: same behaviour, nothing to
-- forget to run.
create index if not exists metzion_listings_board_idx on public.metzion_listings (status, expires_at desc);
create index if not exists metzion_listings_carpenter_idx on public.metzion_listings (carpenter_id);
create index if not exists metzion_listings_regions_idx on public.metzion_listings using gin (regions);

create table if not exists public.metzion_reports (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.metzion_listings(id) on delete cascade,
  reporter_id  uuid references public.carpenters(id) on delete set null,
  reason       text not null check (reason in ('not_available', 'misleading_price', 'inappropriate', 'duplicate', 'spam')),
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index if not exists metzion_reports_open_idx on public.metzion_reports (created_at desc) where resolved_at is null;

-- Server-only, like every table that holds people's details.
alter table public.metzion_listings enable row level security;
alter table public.metzion_reports enable row level security;

-- Listing photos. Public URLs, like product images; the listing itself is what
-- sits behind registration.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('metzion-images', 'metzion-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
