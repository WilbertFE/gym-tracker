-- The season chest: the reward for beating a whole month's boss. Its id is s:YYYY-MM-01 (the first day of the month).
-- Only the chest id check on chest_openings changes, so every row already stored stays valid. Safe to run more than once.
-- Run it before the season gates go live, or opening a season chest cannot be saved.

alter table public.chest_openings drop constraint if exists chest_openings_chest_id_check;
alter table public.chest_openings
  add constraint chest_openings_chest_id_check
  check (chest_id ~ '^[dwgs]:[0-9]{4}-[0-9]{2}-[0-9]{2}$');
