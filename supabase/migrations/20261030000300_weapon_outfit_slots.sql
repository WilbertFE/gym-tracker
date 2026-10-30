-- Two more cosmetic slots for the hero in the gate fight: the weapon (the color of her blade) and the outfit (the colors
-- of her jacket). They are plain nullable columns like the four before them, so every row already stored stays valid.
-- Gear only changes how things look and sound, never damage or XP. Safe to run more than once.

alter table public.equipment
  add column if not exists weapon text check (weapon is null or char_length(weapon) <= 40),
  add column if not exists outfit text check (outfit is null or char_length(outfit) <= 40);
