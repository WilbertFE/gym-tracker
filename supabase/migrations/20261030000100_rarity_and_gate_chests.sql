-- Six chest rarities and the gate chest.
-- Items now have a grade from common up to mythic (common, uncommon, rare, epic, legendary, mythic), and a cleared
-- weekly gate earns a gate chest, whose id is g:YYYY-MM-DD (the week's Monday). Only the two check constraints on
-- chest_openings change, so every row already stored stays valid. Safe to run more than once.

alter table public.chest_openings drop constraint if exists chest_openings_grade_check;
alter table public.chest_openings
  add constraint chest_openings_grade_check
  check (grade in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'));

alter table public.chest_openings drop constraint if exists chest_openings_chest_id_check;
alter table public.chest_openings
  add constraint chest_openings_chest_id_check
  check (chest_id ~ '^[dwg]:[0-9]{4}-[0-9]{2}-[0-9]{2}$');
