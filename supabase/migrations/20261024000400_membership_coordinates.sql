-- Exact map position of the gym, picked on a map. Both set or both empty.
alter table public.memberships
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

alter table public.memberships drop constraint if exists memberships_coordinates_check;
alter table public.memberships
  add constraint memberships_coordinates_check check (
    (latitude is null) = (longitude is null)
    and (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );
