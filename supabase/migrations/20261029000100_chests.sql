-- Quest chests: the chests that have been opened, and the cosmetic items worn.
-- Which chests were earned is worked out from the quests a user finished. Only an opened chest is stored,
-- and the chest id is part of the primary key, so a chest can never be opened twice.
-- Only the server writes these tables (with the service role key); the owner can read their own rows.
-- No insert, update or delete policy on purpose.

create table if not exists public.chest_openings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- d:YYYY-MM-DD for a daily chest, w:YYYY-MM-DD (the week's Monday) for a weekly one.
  chest_id text not null check (chest_id ~ '^[dw]:[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  item_id text not null check (char_length(item_id) <= 40),
  grade text not null check (grade in ('common', 'rare', 'epic', 'legendary')),
  duplicate boolean not null default false,
  -- XP paid for a repeat, once the whole grade is owned.
  bonus_xp integer not null default 0 check (bonus_xp between 0 and 100),
  opened_at timestamptz not null default now(),
  -- The day it was opened in the app's calendar, the day a repeat's XP counts on.
  opened_on date not null,
  primary key (user_id, chest_id)
);

alter table public.chest_openings enable row level security;

drop policy if exists "chest_openings read own" on public.chest_openings;
create policy "chest_openings read own" on public.chest_openings
  for select to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.equipment (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  frame text check (frame is null or char_length(frame) <= 40),
  aura text check (aura is null or char_length(aura) <= 40),
  plate text check (plate is null or char_length(plate) <= 40),
  look text check (look is null or char_length(look) <= 40),
  updated_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

drop policy if exists "equipment read own" on public.equipment;
create policy "equipment read own" on public.equipment
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The nameplate worn next to a nickname on the leaderboard, written by the server when it syncs a score.
alter table public.leaderboard_entries
  add column if not exists plate text check (plate is null or char_length(plate) <= 16);
