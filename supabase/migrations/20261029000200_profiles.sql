-- Player profiles: a username, a display name, a short bio, who may open the profile and which sections
-- others may see. `snapshot` holds what the profile can show, worked out by the server from the owner's own
-- data. Which parts of it others get to see is decided by the server when it is read, so a hidden section
-- is never sent to anyone else.
-- Only the server writes this table (with the service role key) and reads other people's rows through it.
-- The owner can read their own row. No other policy, on purpose.

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 3 and 20),
  bio text check (bio is null or char_length(bio) <= 160),
  visibility text not null default 'private' check (visibility in ('private', 'members')),
  sections jsonb not null default '{"level":true,"stats":true,"collection":true,"titles":true,"muscles":true,"activity":true}',
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A username and a display name each belong to one person, whatever the capitals.
create unique index if not exists profiles_username_key on public.profiles (lower(username));
create unique index if not exists profiles_display_name_key on public.profiles (lower(display_name));

alter table public.profiles enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
