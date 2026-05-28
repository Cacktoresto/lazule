-- LAZULE commerce production foundation: persistent source of truth, event store, jobs, analytics and operational primitives.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  slug text unique,
  name text not null,
  brand text,
  category text,
  description text,
  image_url text,
  sale_price numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  available boolean not null default true,
  margin numeric(8,4),
  atmosphere_json jsonb not null default '{}'::jsonb,
  semantic_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  product_id text primary key references public.products(id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  status text not null default 'in_stock' check (status in ('in_stock','low_stock','reserved','sold_out','on_request','hidden')),
  low_stock_threshold integer not null default 2,
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  status text not null default 'active',
  items_json jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_sessions (
  id text primary key,
  order_id text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  cart_snapshot_json jsonb not null default '[]'::jsonb,
  customer_context_json jsonb not null default '{}'::jsonb,
  preference_id text,
  recovery_token text unique,
  abandonment_state text not null default 'none',
  expires_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  checkout_session_id text references public.checkout_sessions(id) on delete set null,
  status text not null default 'awaiting_payment',
  fulfillment_status text not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  coupon text,
  customer_json jsonb not null default '{}'::jsonb,
  payment_json jsonb not null default '{}'::jsonb,
  consistency_json jsonb not null default '{}'::jsonb,
  processing_json jsonb not null default '{}'::jsonb,
  checkout_json jsonb not null default '{}'::jsonb,
  mp_preference_id text,
  mp_payment_id text,
  external_reference text unique,
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkout_sessions
  add constraint checkout_sessions_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  image_url text,
  position integer not null default 0,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create table if not exists public.payments (
  id text primary key,
  order_id text references public.orders(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_payment_id text unique,
  provider_preference_id text,
  status text not null,
  raw_status text,
  amount numeric(12,2),
  currency text not null default 'BRL',
  pix_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text references public.payments(id) on delete cascade,
  order_id text references public.orders(id) on delete cascade,
  event_type text not null,
  source text not null default 'system',
  payload_json jsonb not null default '{}'::jsonb,
  fingerprint text unique,
  created_at timestamptz not null default now(),
  correlation_id text
);

create table if not exists public.order_events (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  event_type text not null,
  source text not null default 'system',
  payload_json jsonb not null default '{}'::jsonb,
  fingerprint text unique,
  created_at timestamptz not null default now(),
  correlation_id text
);

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago',
  event_type text,
  payment_id text,
  order_id text references public.orders(id) on delete set null,
  headers_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  fingerprint text unique,
  processing_status text not null default 'received',
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  order_id text references public.orders(id) on delete set null,
  checkout_session_id text references public.checkout_sessions(id) on delete set null,
  payment_id text,
  product_ids text[] not null default '{}',
  source text not null default 'lazule_web',
  route text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  correlation_id text
);

create table if not exists public.recommendation_events (
  id text primary key,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  product_id text references public.products(id) on delete set null,
  source text not null default 'lazule_web',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  memory_type text not null,
  subject_id text,
  weight numeric(8,4) not null default 1,
  payload_json jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_memory_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  relationship text not null,
  weight numeric(8,4) not null default 1,
  last_seen_at timestamptz not null default now(),
  source text not null default 'system',
  unique (user_id, entity_type, entity_id, relationship)
);

create table if not exists public.sensory_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  product_id text references public.products(id) on delete cascade,
  atmosphere text,
  note text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.jobs (
  id text primary key,
  type text not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  payload_json jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  idempotency_key text unique,
  correlation_id text,
  order_id text references public.orders(id) on delete set null,
  source text not null default 'system',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text not null,
  enabled boolean not null default false,
  environment text not null default 'production',
  rollout_percentage integer not null default 100 check (rollout_percentage between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, environment)
);

create table if not exists public.experiments (
  id text primary key,
  key text unique not null,
  status text not null default 'draft',
  variants_json jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id text references public.experiments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  variant_key text not null,
  assigned_at timestamptz not null default now(),
  unique (experiment_id, user_id, session_id)
);

create table if not exists public.experiment_events (
  id uuid primary key default gen_random_uuid(),
  experiment_id text references public.experiments(id) on delete cascade,
  assignment_id uuid references public.experiment_assignments(id) on delete set null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_feedback_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_event_id text references public.recommendation_events(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  product_id text references public.products(id) on delete set null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_status_created_at on public.orders(status, created_at desc);
create index if not exists idx_orders_mp_payment_id on public.orders(mp_payment_id);
create index if not exists idx_order_events_order_created_at on public.order_events(order_id, created_at asc);
create index if not exists idx_order_events_fingerprint on public.order_events(fingerprint);
create index if not exists idx_jobs_status_run_at on public.jobs(status, run_at asc);
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at desc);
create index if not exists idx_recommendation_events_user_created_at on public.recommendation_events(user_id, created_at desc);
create index if not exists idx_customer_memory_edges_user on public.customer_memory_edges(user_id, entity_type, relationship);
