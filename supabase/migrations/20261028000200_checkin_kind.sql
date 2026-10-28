-- A check-in is now one of three kinds: gym, home (a workout at home) or rest.
-- Replaces the went_to_gym yes/no. Existing rows keep their meaning: yes becomes gym, no becomes rest.

alter table public.daily_checkins add column if not exists kind text;

-- Only runs while the old column still exists, so the migration can be repeated safely.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_checkins' and column_name = 'went_to_gym'
  ) then
    update public.daily_checkins
    set kind = case when went_to_gym then 'gym' else 'rest' end
    where kind is null;
  end if;
end $$;

update public.daily_checkins set kind = 'rest' where kind is null;

alter table public.daily_checkins alter column kind set default 'rest';
alter table public.daily_checkins alter column kind set not null;

alter table public.daily_checkins drop constraint if exists daily_checkins_kind_check;
alter table public.daily_checkins
  add constraint daily_checkins_kind_check check (kind in ('gym', 'home', 'rest'));

alter table public.daily_checkins drop column if exists went_to_gym;
