-- Friends and the friends boss.
-- friend_codes: one row per player who opened the Friends page. The code is what a friend types to send a request. The name and
--   level are all a friend ever sees of you.
-- friendships: a request and, once accepted, the friendship. One row per pair, whichever way the request went.
-- weekly_boss_damage: the damage a player dealt in a week, written by the server from the player's own sets.
-- Only the server writes here (the service role bypasses row level security). A signed in user can read only their own rows;
-- what a friend may see is read by the server after it has checked the friendship. Safe to run more than once.

create table if not exists public.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null check (code ~ '^[A-Z2-9]{8}$'),
  name text not null check (char_length(name) between 3 and 20),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create unique index if not exists friend_codes_code_key on public.friend_codes (code);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  -- The day the request was accepted. A friend counts for the boss from the next Monday on.
  accepted_on date,
  check (requester_id <> addressee_id),
  check ((status = 'accepted') = (accepted_on is not null))
);

-- One row per pair, whichever way it was sent.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

create table if not exists public.weekly_boss_damage (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  damage integer not null default 0 check (damage >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.friend_codes enable row level security;
alter table public.friendships enable row level security;
alter table public.weekly_boss_damage enable row level security;

drop policy if exists "friend code read own" on public.friend_codes;
create policy "friend code read own" on public.friend_codes
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "friendship read own" on public.friendships;
create policy "friendship read own" on public.friendships
  for select to authenticated using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "boss damage read own" on public.weekly_boss_damage;
create policy "boss damage read own" on public.weekly_boss_damage
  for select to authenticated using (user_id = (select auth.uid()));

-- No insert, update or delete policy on purpose: without one, those are refused for everyone except the service role.

-- The two friends chests: f:YYYY-MM-DD (the Monday of the week) and t:YYYY-MM-DD for the three who dealt the most damage.
alter table public.chest_openings drop constraint if exists chest_openings_chest_id_check;
alter table public.chest_openings
  add constraint chest_openings_chest_id_check
  check (chest_id ~ '^[dwgsft]:[0-9]{4}-[0-9]{2}-[0-9]{2}$');
