-- Per user preferences (country, weight unit, default currency) and the currency of each membership price.
-- Weights stay in kilograms in the database. The unit only changes how the app shows and accepts them.

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- ISO 3166-1 alpha-2, for example ID or US. Used later for local leaderboards.
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  currency text not null default 'IDR' check (currency in ('IDR', 'USD')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings owner" on public.user_settings;
create policy "user_settings owner" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A price is in one currency and is never converted. Existing memberships keep their amount as IDR.
alter table public.memberships
  add column if not exists currency text not null default 'IDR';

alter table public.memberships drop constraint if exists memberships_currency_check;
alter table public.memberships
  add constraint memberships_currency_check check (currency in ('IDR', 'USD'));
