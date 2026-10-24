-- Initial schema for GymTrack. Every table has RLS: a user only sees their own rows.

create type public.muscle_group as enum (
  'chest', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps',
  'forearms', 'abs', 'obliques', 'traps', 'lats', 'lower_back', 'glutes',
  'quads', 'hamstrings', 'calves'
);

create type public.photo_pose as enum ('front', 'side', 'back');

-- profiles ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 50 and 260),
  goal text,
  created_at timestamptz not null default now()
);

-- daily_checkins ------------------------------------------------------
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  went_to_gym boolean not null default false,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3, 1) check (sleep_hours is null or sleep_hours between 0 and 24),
  notes text,
  unique (user_id, date)
);

-- weight_logs ---------------------------------------------------------
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 500),
  notes text
);
create index weight_logs_user_date_idx on public.weight_logs (user_id, date desc);

-- exercises (user_id null = built-in) ---------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  primary_muscle public.muscle_group not null,
  secondary_muscles public.muscle_group[] not null default '{}',
  equipment text
);
create index exercises_user_idx on public.exercises (user_id);

-- workout_sessions ----------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  notes text
);
create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date desc);

-- workout_sets --------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_number integer not null check (set_number > 0),
  reps integer not null check (reps >= 0),
  weight_kg numeric(6, 2) not null default 0 check (weight_kg >= 0),
  rpe numeric(3, 1) check (rpe is null or rpe between 1 and 10)
);
create index workout_sets_session_idx on public.workout_sets (session_id);

-- memberships ---------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gym_name text not null,
  start_date date not null,
  end_date date not null,
  price numeric(12, 2) check (price is null or price >= 0),
  notes text,
  check (end_date >= start_date)
);

-- progress_photos -----------------------------------------------------
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  storage_path text not null,
  pose public.photo_pose not null
);

-- availability_blocks -------------------------------------------------
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  check (end_time > start_time)
);

-- Row Level Security --------------------------------------------------
alter table public.profiles enable row level security;
create policy "profiles owner" on public.profiles
  for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'daily_checkins', 'weight_logs', 'workout_sessions',
    'memberships', 'progress_photos', 'availability_blocks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || ' owner', t);
  end loop;
end $$;

-- exercises: everyone reads built-ins (user_id null), users manage their own.
alter table public.exercises enable row level security;
create policy "exercises read" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises insert own" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises update own" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises delete own" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- workout_sets: owned through the parent session.
alter table public.workout_sets enable row level security;
create policy "workout_sets owner" on public.workout_sets
  for all to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())));

-- Create a profile row on sign up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for progress photos; files live under <user_id>/...
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress photos owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
