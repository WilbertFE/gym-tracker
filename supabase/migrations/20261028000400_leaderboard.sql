-- Leaderboard: one public row per user who chose to join.
-- Only the server writes here (with the service role key, which bypasses row level security).
-- Signed in users can read every row, so a board can be shown, and nobody can write directly,
-- so a score cannot be typed in from a browser. Leaving the board deletes the row.

create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The nickname others see: 3 to 20 characters, no email or markup. Unique ignoring case.
  display_name text not null check (char_length(display_name) between 3 and 20),
  -- ISO 3166-1 alpha-2, copied from the user's settings when the score is synced.
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  total_xp integer not null default 0 check (total_xp >= 0),
  week_xp integer not null default 0 check (week_xp >= 0),
  -- The Monday that week_xp belongs to. An older Monday means no XP yet this week.
  week_start date not null,
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create unique index if not exists leaderboard_entries_name_idx
  on public.leaderboard_entries (lower(display_name));
create index if not exists leaderboard_entries_total_idx
  on public.leaderboard_entries (total_xp desc, updated_at);
create index if not exists leaderboard_entries_country_idx
  on public.leaderboard_entries (country, total_xp desc, updated_at);
create index if not exists leaderboard_entries_week_idx
  on public.leaderboard_entries (week_start, week_xp desc, updated_at);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "leaderboard read" on public.leaderboard_entries;
create policy "leaderboard read" on public.leaderboard_entries
  for select to authenticated
  using (true);

-- No insert, update or delete policy on purpose: without one, those are refused for everyone except
-- the service role.
