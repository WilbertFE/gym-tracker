-- Rank trials that have been cleared, and the title shown on the leaderboard.
-- A trial is cleared once and stays cleared. Only the server writes rank_trials (with the service role
-- key); the owner can read their own rows. No insert, update or delete policy on purpose.

create table if not exists public.rank_trials (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rank_id text not null,
  passed_at timestamptz not null default now(),
  primary key (user_id, rank_id)
);

alter table public.rank_trials enable row level security;

drop policy if exists "rank_trials read own" on public.rank_trials;
create policy "rank_trials read own" on public.rank_trials
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The title worn next to a nickname on the leaderboard, worked out by the server when it syncs a score.
alter table public.leaderboard_entries
  add column if not exists title text check (title is null or char_length(title) <= 40);
