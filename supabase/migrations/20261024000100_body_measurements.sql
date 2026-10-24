-- Body measurements for physique tracking (Phase 6). One row per user per day.

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  chest_cm numeric(5, 1) check (chest_cm is null or chest_cm between 30 and 250),
  waist_cm numeric(5, 1) check (waist_cm is null or waist_cm between 30 and 250),
  hips_cm numeric(5, 1) check (hips_cm is null or hips_cm between 30 and 250),
  arm_cm numeric(4, 1) check (arm_cm is null or arm_cm between 10 and 100),
  thigh_cm numeric(5, 1) check (thigh_cm is null or thigh_cm between 20 and 150),
  body_fat_pct numeric(4, 1) check (body_fat_pct is null or body_fat_pct between 2 and 70),
  unique (user_id, date),
  -- At least one metric per row.
  check (num_nonnulls(chest_cm, waist_cm, hips_cm, arm_cm, thigh_cm, body_fat_pct) >= 1)
);

alter table public.body_measurements enable row level security;

create policy "body_measurements owner" on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
