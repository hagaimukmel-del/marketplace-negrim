-- =============================================================================
-- 0005 · OFFER PAGE
-- =============================================================================
-- The schema behind /o/[token] — the personal link that goes out in the weekly
-- WhatsApp message.
--
-- Why this shape. Two campaigns run by hand against the same ~400-name list
-- produced very different results: a 22% discount on a 3.80 ILS consumable
-- brought 4 buyers and 665 ILS, while a plain "here is a product you may not
-- know" message on a 150 ILS item brought 7 buyers and 3,600 ILS at full
-- margin. Both sold exactly one SKU per order. Conversion is close to its
-- ceiling; basket size is untouched. So the page's whole job is to turn a
-- one-line order into a several-line one, and to make the response measurable —
-- today the sender cannot tell who opened anything.
--
-- Identity is a token in a URL, not a login. A carpenter will not create a
-- password to reorder a carton of glue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- carpenters — the distribution list, and the most valuable asset here
-- -----------------------------------------------------------------------------
-- Names and phone numbers of real businesses. No anon policy, ever: this table
-- is reachable only through server code holding the service role. If it leaked,
-- a supplier could route around the platform in an afternoon.

create table if not exists public.carpenters (
  id            uuid primary key default gen_random_uuid(),

  -- The secret in the personal link: unguessable, stable, one per carpenter.
  -- Derived from gen_random_uuid() rather than pgcrypto's gen_random_bytes,
  -- which Supabase installs into the `extensions` schema and is therefore not
  -- on the search_path here. 22 hex characters is 88 bits — short enough for a
  -- WhatsApp link, far beyond guessing.
  token         varchar not null unique
                  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 22),

  business_name varchar not null,
  contact_name  varchar,
  phone         varchar,
  email         varchar,
  city          varchar,

  -- set when someone actually opens their link, so reach can be measured
  -- against a real denominator rather than a guess at list size
  first_seen_at timestamptz,
  last_seen_at  timestamptz,

  is_active     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_carpenters_phone on public.carpenters using btree (phone);

drop trigger if exists update_carpenters_updated_at on public.carpenters;
create trigger update_carpenters_updated_at
  before update on public.carpenters
  for each row execute function public.update_updated_at();

-- -----------------------------------------------------------------------------
-- campaigns — one weekly message
-- -----------------------------------------------------------------------------

create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              varchar not null,

  -- the product the message is about
  product_id        uuid not null references public.products (id) on delete restrict,

  -- 'introduction' outperformed 'discount' 5.4x on revenue at full margin,
  -- so the kind is recorded and reported on rather than assumed
  kind              varchar not null default 'introduction'
                      check (kind in ('introduction', 'discount', 'restock')),

  headline_he       varchar,
  body_he           text,

  -- only set for a discount campaign; the product's own price is the default
  offer_price_excl_vat numeric check (offer_price_excl_vat >= 0),

  starts_at         timestamptz not null default now(),
  ends_at           timestamptz,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists idx_campaigns_active on public.campaigns using btree (is_active, starts_at desc);

-- -----------------------------------------------------------------------------
-- link orders back to who placed them and what prompted it
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists carpenter_id uuid references public.carpenters (id) on delete set null;

alter table public.orders
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

create index if not exists idx_orders_carpenter_id on public.orders using btree (carpenter_id);
create index if not exists idx_orders_campaign_id  on public.orders using btree (campaign_id);

-- -----------------------------------------------------------------------------
-- order_intents — interest that is not yet an order
-- -----------------------------------------------------------------------------
-- "I'd take 8 boards at the right price" is not an order and must not be
-- stored as one. Two things need this. It captures the near-miss that is lost
-- today, and it is the mechanism demand aggregation is built on: thirty of
-- these for the same product is the volume you take to a distributor and ask
-- what price it buys. Kept deliberately small — the pooling logic itself waits
-- until a first aggregation actually runs.

create table if not exists public.order_intents (
  id           uuid primary key default gen_random_uuid(),
  carpenter_id uuid not null references public.carpenters (id) on delete cascade,
  product_id   uuid not null references public.products   (id) on delete cascade,
  campaign_id  uuid references public.campaigns (id) on delete set null,

  quantity     integer not null check (quantity > 0),
  note         text,

  status       varchar not null default 'open'
                 check (status in ('open', 'quoted', 'converted', 'expired')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_order_intents_product on public.order_intents using btree (product_id, status);
create index if not exists idx_order_intents_carpenter on public.order_intents using btree (carpenter_id);

drop trigger if exists update_order_intents_updated_at on public.order_intents;
create trigger update_order_intents_updated_at
  before update on public.order_intents
  for each row execute function public.update_updated_at();

-- -----------------------------------------------------------------------------
-- offer_events — the denominator that does not exist today
-- -----------------------------------------------------------------------------
-- Written from the server only. A public insert policy would let anyone forge
-- rows and poison the one dataset this business is supposed to accumulate.
-- Deliberately narrow: four event types, not a general analytics pipeline.

create table if not exists public.offer_events (
  id           uuid primary key default gen_random_uuid(),
  carpenter_id uuid references public.carpenters (id) on delete cascade,
  campaign_id  uuid references public.campaigns  (id) on delete set null,
  product_id   uuid references public.products   (id) on delete set null,

  event_type   varchar not null
                 check (event_type in (
                   'offer_opened',
                   'item_added',
                   'order_sent',
                   'intent_registered',
                   'search_no_results'
                 )),

  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_offer_events_type_time on public.offer_events using btree (event_type, created_at desc);
create index if not exists idx_offer_events_campaign  on public.offer_events using btree (campaign_id);
create index if not exists idx_offer_events_carpenter on public.offer_events using btree (carpenter_id);

-- -----------------------------------------------------------------------------
-- row level security: all four are server-only
-- -----------------------------------------------------------------------------
-- No policies. The offer page is server-rendered and looks the carpenter up by
-- token there, so the browser never needs to reach these tables directly.

alter table public.carpenters    enable row level security;
alter table public.campaigns     enable row level security;
alter table public.order_intents enable row level security;
alter table public.offer_events  enable row level security;
