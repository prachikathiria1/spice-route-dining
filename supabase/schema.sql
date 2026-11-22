-- Spice Route · Smart Dining — Supabase schema (free tier)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Design: one table per app collection. Each row stores the record as JSONB in
-- `data` (the same shape the app uses in local mode), keyed by `id`. This keeps the
-- local and Supabase adapters symmetric and lets you evolve fields without migrations.
-- Typed generated columns are added for the fields you'd query/report on.

create table if not exists public.settings          (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.menu_items        (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.restaurant_tables (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.orders            (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.waiter_calls      (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.payments          (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.reviews           (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.quiz_scores       (id text primary key, data jsonb not null, updated_at timestamptz not null default now());

-- Handy typed columns for reporting / filtering in SQL.
alter table public.orders       add column if not exists table_id text    generated always as (data->>'tableId') stored;
alter table public.orders       add column if not exists status   text    generated always as (data->>'status') stored;
alter table public.payments     add column if not exists table_id text    generated always as (data->>'tableId') stored;
alter table public.payments     add column if not exists total    numeric generated always as ((data->>'total')::numeric) stored;
alter table public.waiter_calls add column if not exists table_id text    generated always as (data->>'tableId') stored;

create index if not exists orders_table_status_idx on public.orders (table_id, status);
create index if not exists payments_table_idx      on public.payments (table_id);
create index if not exists waiter_calls_table_idx  on public.waiter_calls (table_id);

-- Realtime: broadcast row changes to subscribed clients.
do $$
declare t text;
begin
  foreach t in array array['settings','menu_items','restaurant_tables','orders','waiter_calls','payments','reviews','quiz_scores'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Row Level Security.
-- ⚠ DEMO POLICIES: the anon key can read & write everything so the app works with
-- zero auth. Before real use, add Supabase Auth for staff and tighten these
-- (e.g. guests may only insert orders/waiter_calls/reviews/quiz_scores; only
-- authenticated staff may update orders, menu_items, settings, restaurant_tables).
do $$
declare t text;
begin
  foreach t in array array['settings','menu_items','restaurant_tables','orders','waiter_calls','payments','reviews','quiz_scores'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "demo_all_%1$s" on public.%1$I', t);
    execute format('create policy "demo_all_%1$s" on public.%1$I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- The app seeds sample data automatically on first load when `settings` is empty.
