-- Where the gym is: a branch name, area or address. Free text, optional.
alter table public.memberships
  add column location text check (location is null or char_length(location) <= 120);
