-- =========================================================
-- مرآة (Mir'aa) — Core schema: roles, plans, assignments
-- Currency: USDT everywhere. Run this in Supabase SQL editor
-- or via the Supabase MCP once connected.
-- =========================================================

-- ---------- ROLES ----------
-- super_admin      = المدير العام  (full control, appoints admins)
-- admin            = المدير        (manages users, assigns supervisors to plans)
-- trade_supervisor = مشرف على الصفقات (publishes/oversees signals for an assigned plan)
-- client           = مستخدم عادي (subscriber who copies trades)
create type user_role as enum ('super_admin', 'admin', 'trade_supervisor', 'client');

create table if not exists users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique not null,
  password_hash       text not null,
  role                user_role not null default 'client',
  full_name           text,
  locale              text not null default 'en' check (locale in ('en','ar')),
  binance_api_key_enc bytea,
  binance_secret_enc  bytea,
  binance_verified_capital_usdt numeric(18,2), -- last-checked Binance balance snapshot, used to gate plan eligibility
  binance_verified_at timestamptz,             -- when that snapshot was taken (staleness matters for eligibility)
  created_by          uuid references users(id), -- who appointed/created this account (super_admin appointing an admin, etc.)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- audit trail every time a role is granted or changed — required for super_admin oversight
create table if not exists role_assignments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  old_role      user_role,
  new_role      user_role not null,
  assigned_by   uuid not null references users(id), -- must be a super_admin for admin/trade_supervisor grants
  reason        text,
  created_at    timestamptz not null default now()
);

-- ---------- PLANS ----------
create table if not exists plans (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,           -- 'basic' | 'pro' | 'elite'
  name_en                text not null,
  name_ar                text not null,
  description_en         text,
  description_ar         text,
  price_usdt             numeric(10,2) not null,
  billing_period         text not null default 'monthly' check (billing_period in ('monthly','yearly')),

  -- risk / execution rules enforced by the worker — not decorative
  max_exposure_ratio     numeric(5,4) not null default 0.05,  -- e.g. 0.05 = 5% of capital per trade
  order_limit_per_day    integer,                              -- null = unlimited

  -- eligibility condition: minimum verified Binance capital required to subscribe
  -- e.g. Basic plan requires >= 3000 USDT collateral in the user's Binance account
  min_capital_usdt       numeric(18,2) not null default 0,

  telegram_channel_id    text,             -- set once the Telegram bot creates/links the channel
  includes_telegram      boolean not null default false,

  is_active              boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------- SUBSCRIPTIONS ----------
create type subscription_status as enum ('pending_payment','active','past_due','canceled','rejected_capital');

create table if not exists subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  plan_id            uuid not null references plans(id),
  status             subscription_status not null default 'pending_payment',

  -- USDT payment tracking (e.g. via NOWPayments or direct TRC20/ERC20 address)
  usdt_amount_due     numeric(10,2) not null,
  usdt_tx_hash        text,               -- on-chain transaction hash once paid
  payment_network     text,               -- 'TRC20' | 'ERC20' | 'BEP20'

  capital_check_passed boolean not null default false,   -- snapshot of eligibility check at subscribe time
  capital_checked_at    timestamptz,

  current_period_start timestamptz,
  current_period_end   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  unique (user_id, plan_id, status) -- prevents duplicate active subscriptions to the same plan
);

-- ---------- SUPERVISOR <-> PLAN ASSIGNMENT ----------
-- an admin assigns a trade_supervisor to oversee a specific plan's signal flow
create table if not exists supervisor_plan_assignments (
  id             uuid primary key default gen_random_uuid(),
  supervisor_id  uuid not null references users(id),
  plan_id        uuid not null references plans(id),
  assigned_by    uuid not null references users(id), -- must be admin or super_admin
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (supervisor_id, plan_id)
);

-- ---------- SEED: default plans matching current business rules ----------
insert into plans (slug, name_en, name_ar, price_usdt, max_exposure_ratio, order_limit_per_day, min_capital_usdt, includes_telegram, sort_order)
values
  ('basic', 'Basic', 'أساسي', 19, 0.05, 10, 3000, false, 1),
  ('pro',   'Pro',   'احترافي', 49, 0.15, null, 5000, true, 2),
  ('elite', 'Elite', 'نخبة', 99, 0.20, null, 10000, true, 3)
on conflict (slug) do nothing;

-- ---------- ORDERS (copied trades, one per signal per user) ----------
create type order_status as enum ('pending','executing','filled','failed','canceled');

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  client_order_id   text not null,          -- idempotency key, unique per user
  symbol            text not null,
  side              text not null check (side in ('BUY','SELL')),
  quantity          numeric(20,8) not null,
  price             numeric(20,8) not null,
  status            order_status not null default 'pending',
  binance_order_id  bigint,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, client_order_id)
);

alter table orders enable row level security;
create policy "orders read own" on orders for select using (auth.uid() = user_id);

-- realtime: lets the client dashboard subscribe to live status changes (PENDING -> FILLED)
alter publication supabase_realtime add table orders;

-- ---------- ROW LEVEL SECURITY ----------
alter table users enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table supervisor_plan_assignments enable row level security;
alter table role_assignments enable row level security;

-- clients can read only their own row; staff roles read via backend service role (bypasses RLS)
create policy "users read own row" on users
  for select using (auth.uid() = id);

create policy "plans are publicly readable" on plans
  for select using (is_active = true);

create policy "subscriptions read own" on subscriptions
  for select using (auth.uid() = user_id);

-- NOTE: all writes (role changes, plan edits, subscription activation) go through the
-- NestJS backend using the Supabase service-role key, never directly from the client.
-- RLS here protects against direct client reads only.
