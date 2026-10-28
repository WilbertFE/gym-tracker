-- Double XP Day boosters that have been used: one row per boosted day.
-- How many boosters a user has earned is worked out from their activity. Only the used ones are stored.
-- Rows can be read and added but not changed or removed, so a used booster stays used.

create table if not exists public.xp_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.xp_boosts enable row level security;

drop policy if exists "xp_boosts read own" on public.xp_boosts;
create policy "xp_boosts read own" on public.xp_boosts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "xp_boosts add own" on public.xp_boosts;
create policy "xp_boosts add own" on public.xp_boosts
  for insert to authenticated
  with check (user_id = (select auth.uid()));
