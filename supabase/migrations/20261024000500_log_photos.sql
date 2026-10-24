-- Photos attached to a daily check-in or a weigh-in (selfies, gym places).
-- Files live in the private progress-photos bucket under <user id>/log/<photo id>.<ext>,
-- which the existing storage policy already covers (first folder is the user id).
-- Deleting the check-in or weigh-in deletes its rows here; the app removes the files first.

create table if not exists public.log_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkin_id uuid references public.daily_checkins (id) on delete cascade,
  weight_id uuid references public.weight_logs (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  -- A photo belongs to exactly one entry.
  check (num_nonnulls(checkin_id, weight_id) = 1)
);

create index if not exists log_photos_user_idx on public.log_photos (user_id, created_at desc);
create index if not exists log_photos_checkin_idx on public.log_photos (checkin_id);
create index if not exists log_photos_weight_idx on public.log_photos (weight_id);

alter table public.log_photos enable row level security;

drop policy if exists "log_photos owner" on public.log_photos;
create policy "log_photos owner" on public.log_photos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    -- The entry must be the user's own, so a photo cannot be attached to someone else's row.
    and (checkin_id is null or exists (
      select 1 from public.daily_checkins c
      where c.id = checkin_id and c.user_id = (select auth.uid())))
    and (weight_id is null or exists (
      select 1 from public.weight_logs w
      where w.id = weight_id and w.user_id = (select auth.uid())))
  );
