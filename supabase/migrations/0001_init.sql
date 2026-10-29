-- M1 schema per TECH_STACK §4. Units: 1 display point = 10 units. XP and coins strictly separated.
-- All balance/stock/XP writes go through SECURITY DEFINER functions (migration 0002), never direct writes.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, locale text default 'en', country text,
  role text not null default 'user' check (role in ('user','merchant_staff','platform_operator')),
  merchant_id uuid, consent_version text, consented_at timestamptz,
  demo_time_skip boolean default false, created_at timestamptz default now()
);
create table spirits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  xp int not null default 0 check (xp >= 0), stage int not null default 0,
  current_asset_id uuid, identity_anchor jsonb, world_palette_unlocked int default 0,
  created_at timestamptz default now()
);
create table spirit_assets (
  id uuid primary key default gen_random_uuid(),
  spirit_id uuid references spirits on delete cascade, parent_id uuid,
  stage int, status text check (status in ('QUEUED','RUNNING','READY','FAILED')),
  phone_path text, pendant_sprite_path text, sha256 text,
  source text check (source in ('meta_live','demo_fixture')), error text,
  created_at timestamptz default now()
);
create table interactions (
  event_id uuid primary key,
  user_id uuid not null references profiles, category text not null,
  intent text, confidence numeric, source text not null, day_key date not null,
  is_demo boolean default false, created_at timestamptz default now()
);
create table xp_receipts (
  event_id uuid primary key references interactions,
  spirit_id uuid references spirits, category text, xp int not null, day_key date not null
);
create table campaigns (
  id uuid primary key default gen_random_uuid(), name text, region text,
  status text check (status in ('ACTIVE','PAUSED','ENDED')),
  committed_units bigint not null default 0,
  buffer_fraction numeric default 0.2, is_demo boolean default true,
  starts_at timestamptz, ends_at timestamptz
);
create table ledger_events (
  id bigserial primary key, campaign_id uuid references campaigns, user_id uuid references profiles,
  kind text not null check (kind in ('GRANT','HOLD','RELEASE','REDEEM_BURN','RESOLUTION')),
  units bigint not null, ref_id uuid, idempotency_key text unique, rule_version text,
  created_at timestamptz default now()
);
create table stock_lots (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references campaigns,
  merchant_id uuid not null, product text, allergens text[], price_units int not null,
  free_stock int not null check (free_stock >= 0), reserved_stock int not null default 0 check (reserved_stock >= 0),
  pickup_window tstzrange, expires_at timestamptz, is_demo boolean default true
);
create table reservations (
  id uuid primary key default gen_random_uuid(), lot_id uuid references stock_lots,
  user_id uuid references profiles, units_held int not null,
  mode text check (mode in ('SELF','SHARE')), status text, expires_at timestamptz,
  idempotency_key text unique, created_at timestamptz default now()
);
create table vouchers (
  id uuid primary key default gen_random_uuid(), reservation_id uuid unique references reservations,
  holder_id uuid references profiles, token_hash text unique not null,
  state text check (state in ('ISSUED','SHARED','CLAIMED','REDEEMED','EXPIRED')), expires_at timestamptz
);
create table redemptions (
  reservation_id uuid primary key references reservations,
  merchant_id uuid not null, staff_id uuid references profiles, completed_at timestamptz default now()
);
create table rooms (
  id uuid primary key default gen_random_uuid(), host_id uuid references profiles,
  mode text, participant_limit int check (participant_limit between 2 and 4),
  seed bigint, start_at timestamptz, status text, invite_expires_at timestamptz
);
create table room_members (
  room_id uuid references rooms on delete cascade, user_id uuid, is_simulated boolean default false,
  ready_at timestamptz, primary key (room_id, user_id)
);
create table ai_usage (
  id bigserial primary key, user_id uuid, kind text check (kind in ('intent','describe','image','segment','audio')),
  model_id text, status text check (status in ('RESERVED','SETTLED','RELEASED')),
  est_usd numeric(10,5), actual_usd numeric(10,5), input_tokens int, output_tokens int, created_at timestamptz default now()
);
create table app_events (
  id bigserial primary key, user_id uuid, session_id uuid, name text not null,
  props jsonb, country text, locale text, ua_class text, created_at timestamptz default now()
);
create table appeals (
  id uuid primary key default gen_random_uuid(), owner_id uuid, scope text, body text,
  status text default 'OPEN', resolution text, created_at timestamptz default now()
);

-- RLS on; direct writes to money tables forbidden (functions in 0002).
alter table profiles enable row level security;
alter table spirits enable row level security;
alter table spirit_assets enable row level security;
alter table interactions enable row level security;
alter table xp_receipts enable row level security;
alter table campaigns enable row level security;
alter table ledger_events enable row level security;
alter table stock_lots enable row level security;
alter table reservations enable row level security;
alter table vouchers enable row level security;
alter table redemptions enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table ai_usage enable row level security;
alter table app_events enable row level security;
alter table appeals enable row level security;
